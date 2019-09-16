---
layout: post
comments: true
title:  "Sitecore 9 View Precompilation"
date:   2019-09-16 11:04:24 -0400
categories: Sitecore
tags: Sitecore-9.1 Azure-Paas Precompile view-precompiling elastic-pools performance-enhancements
---

Timeouts, 502's, coffee breaks. All these things inevitably happen when deploying to an Azure PAAS Sitecore instance, and while coffee is always appreciated, there's a limit. The amount of time that can be spent waiting for the site to come back up destroys testing efficiency, and may also frustrate clients. There are a few things you can do to improve this performance including upgrading to premium tier app services and switching to two SQL elastic pools (one for core/master/web, one for all other databases), but the largest impact by far comes from precompiling views.

At first glance, precompiling your views seems to be an incredibly easy process. *If it works*. I've seen precompiling work like a charm on some projects, and require immense effort on others. Below, I'll go over two paths for what you may find in different environments.

### The easy path:

You're likely to go through this if you're lucky and/or running the most basic Sitecore projects without many extensions or an ORM tool.

1. Using Nuget, install the RazorGenerator.Msbuild package into each project which contains razor views.
2. Add a precompilation configuration for Sitecore to recognize which views it should be checking for in .dll's vs cshtml files.

{% highlight html %}
<configuration xmlns:patch="http://www.sitecore.net/xmlconfig/">
  <sitecore>
    <mvc>
      <precompilation>
        <assemblies>
          <!-- Foundation -->
          <assemblyIdentity name="Enterprise.Foundation.BasePage" />
          <!-- Feature -->
          <assemblyIdentity name="Enterprise.Feature.Navigation" />
          <assemblyIdentity name="Enterprise.Feature.News" />
          <assemblyIdentity name="Enterprise.Feature.ReusableComponents" />
          <assemblyIdentity name="Enterprise.Feature.Search" />
          <!-- Project -->
          <assemblyIdentity name="Enterprise.Project.Company" />
        </assemblies>
      </precompilation>
    </mvc>
    <settings>
      <setting name="Mvc.UsePhysicalViewsIfNewer" value="false" />
    </settings>
  </sitecore>
</configuration>
{% endhighlight %}

That was easy! You should then be able to decompile the .dll and find the source code for your pre-compiled views under 

![Decompiled-precompiled-dll]({{ site.baseurl }}/images/posts/2019-09-16-Precompiling-Sitecore-Views/decompiled-dll.png){:class="img-responsive"}


### The hard path:

On the opposite side, you're likely to go through this if you're unlucky, or have a more complex solution setup. The steps outlined below *may* include unnecessary steps, but it includes everything I needed to get it working.

1. Download the RazorGenerator.Mvc nuget package into each project with views you wish to precompile.
2. [Install the Razor Generator visual studio extension found here.](https://marketplace.visualstudio.com/items?itemName=DavidEbbo.RazorGenerator)
3. Set all of your views to build action none.
4. Set directives for the RazorGenerator extension. This can be included in each individual view, or as a directives file in each views folder. I've noticed some difficulty getting the directives file method to work consistently, and since views were being created via plop we decided it was easier to include the directives in each view, despite the higher initial startup time. YMMV, but I also ran into several errors if I didn't include all references in the directives. It seemed like the web.config was not being used for the precompilation, so I added all references from the web.config into the directives.

**When included in the view**
{% highlight html %}
@*Generator: MvcView
    Imports: System.Linq, System.Web.Mvc, System.Web.Mvc.Ajax, System.Web.Mvc.Html, System.Web.Routing, Sitecore.Mvc, Sitecore.Mvc.Presentation, Sitecore.Globalization, Glass.Mapper.Sc.Web.Mvc*@
@using Glass.Mapper.Sc.Web.Mvc
@model Fulton.Feature.Navigation.Models.ViewModels.HeaderViewModel
{% endhighlight %}


**When included as a separate RazorGenerator.Directives file in the views folder**
{% highlight csharp %}
Generator: MvcView
Imports: System.Linq, System.Web.Mvc, System.Web.Mvc.Ajax, System.Web.Mvc.Html, System.Web.Routing, Sitecore.Mvc, Sitecore.Mvc.Presentation, Sitecore.Globalization, Glass.Mapper.Sc.Web.Mvc
{% endhighlight %}

{:start="5"}
5. For each project with views, run `Enable-RazorGenerator`. This will set the 'Custom Tool' property in each view to 'RazorGenerator', and if the directives are set you will notice it create a .cs file underneath each .cshtml file. These .cs files are what get compiled into the .dll. At any point, you can also right click on the .cshtml file to 'run custom tool' and regenerate the .cs file. Alternatively, you can run `Redo-RazorGenerator` from the package manager console to recompile all views in any given project.
6. Add a config to the project to enable view precompilation from the Sitecore side. (The same config is used between both approaches, see step 2 of the first approach for an example configuration file.)
7. If using glass, add a precompiled view finder. The code below is a slightly modified version of a more popular snippet which will also allow you to enable/disable using .cshtml files when newer. I added this all into the GlassMapperScCustom.cs file.
{% highlight csharp %}
public class CompileViewTypeFinder : IViewTypeResolver
{
    public Type GetType(string path)
    {

        ViewContext current = ContextService.Get().GetCurrent<ViewContext>();
        var partial = System.Web.Mvc.ViewEngines.Engines.FindPartialView((ControllerContext)current, path);
        var view = partial.View as PrecompiledMvcView;

        if(view == null)
        {
            Sitecore.Diagnostics.Log.Warn(string.Format(
                                "View {0} does not exist in a precompiled state. The .cshtml file will attempt to be used.",
                                path), this);

            return typeof(NullModel);
        }

        var type = typeof(PrecompiledMvcView).GetField("_type", BindingFlags.Instance | BindingFlags.NonPublic).GetValue(view)
            as Type;

        Type baseType = type.BaseType;

        if (baseType == null || !baseType.IsGenericType)
        {
            Sitecore.Diagnostics.Log.Warn(string.Format(
                "View {0} compiled type {1} base type {2} does not have a single generic argument.",
                path,
                type,
                baseType), this);

            return typeof(NullModel);
        }

        Type proposedType = baseType.GetGenericArguments()[0];
        return proposedType == typeof(object)
            ? typeof(NullModel)
            : proposedType;
    }
}

public static partial class GlassMapperScCustom
{
    ...
    public static void PostLoad() 
    {
        GetModelFromView.ViewTypeResolver = new ChainedViewTypeResolver(
                new IViewTypeResolver[] {
                new CompiledViewTypeFinder(),
                new RegexViewTypeResolver() });
    }
    ...
}
{% endhighlight %}

Voila! Only 4x the work, but it works beautifully, and debatably better. The "easy path" has some problems using the 'Mvc.UsePhysicalViewsIfNewer' setting, and is also more difficult to troubleshoot, as the precompiled views are not included directly in the solution. This will also work on any remote build system, since the .cs files are already checked into source control and get easily compiled into the .dll. [For further documentation, the Razor Generator github page also has some decent documentation.](https://github.com/RazorGenerator/RazorGenerator)

