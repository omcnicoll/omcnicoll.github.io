---
layout: post
comments: true
title:  "Creating A Custom SXA Compliant Rendering"
date:   2019-04-05 11:04:24 -0400
categories: Sitecore
tags: Sitecore-9.1 SXA-1.8 The-SXA-Way
---
Now that we've explored the building blocks of creating SXA components without touching any code, what if for some reason you absolutely cannot create your component with rendering variants? In that case, we still have the option of writing custom components from scratch, it just takes a few more steps than it traditionally would. Let's take a look at how we would do this by creating the hero component again, but as a custom rendering.


To kick it off, lets hop right into some code. The files we'll need to create include:
- Model
- View
- Controller
- Repository interface and implementation
- Dependency registration class
- Config to setup our dependency registration

You'll notice there are a few extra files than we would need for regular MVC Sitecore, and we'll go over what each of these do briefly as we create them. In the meantime, lets get started with our model. We'll create it under `Model/CustomHeroViewModel.cs`.


{% highlight csharp %}
using Sitecore.XA.Foundation.Variants.Abstractions.Models;
using System.Collections.Generic;
using Sitecore.Data.Items;

namespace Project.Feature.XA.CustomHero.Models
{
    public class CustomHeroViewModel : VariantsRenderingModel
    {
        public string HeroImageSource { get; set; }
        public List<Item> CTAItems { get; set; }
    }
}
{% endhighlight %}


Next, we'll create the view under `Views/CustomHero/GetCustomHero.cshtml` and the controller under `Controllers/CustomHeroController.cs`. Two important things to note about the view are that the first two divs of markup in the view are **required** for SXA compliance, and the view is specifically named *GetRenderingName* because the default Index controller method will be looking for a view by that name.

{% highlight html %}
@using Sitecore.XA.Foundation.SitecoreExtensions.Extensions
@using Sitecore.XA.Foundation.MarkupDecorator.Extensions
@using Sitecore.Mvc
@model Project.Feature.XA.CustomHero.Models.CustomHeroViewModel

@if (Model.DataSourceItem != null || Html.Sxa().IsEdit)
{
  <div @Html.Sxa().Component("CustomHero", Model.Attributes)>
    <div class="component-content">
      <section class="container component-hero" style="background-image: url(@Model.HeroImageSource)">
        <div class="hero-container">
          <div class="row">
            <div class="col-xs-12 col-sm-8">
              <div class="hero-title">
                <h1>@Html.Sitecore().Field("Title")</h1>
                <div class="row">
                  <div class="col-12">
                    @foreach (var cta in Model.CTAItems)
                    {
                      var linkField = (Sitecore.Data.Fields.LinkField)cta.Fields["Link"];
                      <a href="@linkField.GetFriendlyUrl()" class="hero-cta-link">
                        <span>
                          @linkField.Text
                        </span>
                      </a>
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
}
{% endhighlight %}


{% highlight csharp %}
using Project.Feature.XA.CustomHero.Repositories;
using Sitecore.XA.Foundation.RenderingVariants.Controllers;

namespace Project.Feature.XA.CustomHero.Controllers
{
    public class CustomHeroController : VariantsController
    {
        private readonly ICustomHeroRepository _repository;
        public CustomHeroController(ICustomHeroRepository CustomHeroRepository) => _repository = CustomHeroRepository;
        protected override object GetModel()
        {
            return _repository.GetModel();
        }
    }
}
{% endhighlight %}


You may have noticed that we're inheriting from `VariantsController` and **not** `StandardController`. While `StandardController` will work fine, it doesn't leave you open to extension with variants down the road. I haven't yet seen a reason not to inherit from `VariantsController` from the beginning, so I've done so here.


Next come the SXA-specific files. We're going to create the repository getting injected into our controller, as well as its interface under `Repositories/`. Even though our interface is empty, it is still required that we have one.


{% highlight csharp %}
using Sitecore.XA.Foundation.Mvc.Repositories.Base;
using Sitecore.XA.Foundation.RenderingVariants.Repositories;

namespace Project.Feature.XA.CustomHero.Repositories
{
    public interface ICustomHeroRepository : IVariantsRepository
    {
    }
}
{% endhighlight %}


{% highlight csharp %}
using Sitecore.Diagnostics;
using Sitecore.XA.Foundation.Mvc.Repositories.Base;
using Sitecore.Data.Items;
using System.Linq;
using System;
using Project.Feature.XA.CustomHero.Models;
using Sitecore.XA.Foundation.RenderingVariants.Repositories;
using System.Collections.Generic;

namespace Project.Feature.XA.CustomHero.Repositories
{
    public class CustomHeroRepository : VariantsRepository, ICustomHeroRepository
    {
        public override IRenderingModelBase GetModel()
        {
            CustomHeroViewModel model = new CustomHeroViewModel();
            FillBaseProperties(model);
            model.HeroImageSource = GetBackgroundImageUrl(model);
            model.CTAItems = GetCtaItems(model);
            return model;
        }

        private string GetBackgroundImageUrl(CustomHeroViewModel model)
        {
            Sitecore.Data.Fields.ImageField image = model.Item.Fields["BackgroundImage"];
            return Sitecore.Resources.Media.MediaManager.GetMediaUrl(image.MediaItem) ?? string.Empty;
        }

        private List<Item> GetCtaItems(CustomHeroViewModel model)
        {
            List<Item> ctaItems = new List<Item>();
            Sitecore.Data.Fields.MultilistField links = model.Item.Fields["CTALinks"];
            if(links != null && links.TargetIDs.Any())
            {
                foreach (var id in links.TargetIDs)
                {
                    ctaItems.Add(Sitecore.Context.Database.GetItem(id));
                }
            }
            return ctaItems;
        }
    }
}
{% endhighlight %}

Finally, we'll be registering our dependencies under `Dependencies/RegisterDependencies.cs` and adding the configurator node in a config file. 


{% highlight csharp %}
using Project.Feature.XA.CustomHero.Controllers;
using Project.Feature.XA.CustomHero.Repositories;
using Sitecore.DependencyInjection;
using Microsoft.Extensions.DependencyInjection;

namespace Project.Feature.XA.CustomHero.Dependencies
{
    public class RegisterDependencies : IServicesConfigurator
    {
        public void Configure(IServiceCollection serviceCollection)
        {
            serviceCollection.AddTransient<ICustomHeroRepository, CustomHeroRepository>();
            serviceCollection.AddTransient<CustomHeroController>();
        }
    }
}
{% endhighlight %}

{% highlight xml %}
<configuration xmlns:patch="http://www.sitecore.net/xmlconfig/">
  <sitecore>
    <services>
      <configurator type=" Project.Feature.XA.CustomHero.Dependencies.RegisterDependencies,  Project.Feature.XA.CustomHero"/>
    </services>
  </sitecore>
</configuration>
{% endhighlight %}

If you followed all of the steps, you should end up with project structure similar to this:
![Project-Structure]({{ site.baseurl }}/images/posts/2019-04-05-The-SXA-Way-Custom-Rendering/FinalStructure.jpg){:class="img-responsive"}

Great, that sums up all the required code! Let's publish our new project and head over to Sitecore to get our new component working. While you could go through the process of creating all of the sitecore items manually, we have access to the `Clone Rendering` script we [demonstrated in a previous post]({{ site.baseurl }}/2019/The-SXA-Way-Cloning-Rendering-Deep-Dive/). Let's use that, with the only difference being we'll select to use the view we just published.

With those items all created for us, we only have a few more steps to complete manually.
1. Update the controller action to our custom controller `Project.Feature.XA.CustomHero.Controllers.CustomHeroController,Project.Feature.XA.CustomHero`
2. Add our new rendering to the available renderings in our SXA site

And that's it! You should now be able to open up the experience editor and drag and drop your custom component. 


What if you decide you really miss out on rendering variants though? No problem! Since we created our model and controller with the variant implementations, we can easily add a rendering variant block. *Note: While we can add a rendering variant block, it's important to know that we can't switch back and forth. Once we include the rendering variant block and start rendering markup from Sitecore, we can't add more of our custom markup within that block.*

For this example, we'll swap the CTA button markup with the rendering variant block and use the rendering variants in Sitecore to render the CTA buttons. While we should remove unnecessary code with this change as well, all we really **need** to change is the view.


{% highlight html %}
@using Sitecore.XA.Foundation.SitecoreExtensions.Extensions
@using Sitecore.XA.Foundation.MarkupDecorator.Extensions
@using Sitecore.XA.Foundation.RenderingVariants.Extensions
@using Sitecore.XA.Foundation.RenderingVariants.Fields
@using Sitecore.XA.Foundation.Variants.Abstractions.Fields
@using Sitecore.Mvc
@model Project.Feature.XA.CustomHero.Models.CustomHeroViewModel

@if (Model.DataSourceItem != null || Html.Sxa().IsEdit)
{
  <div @Html.Sxa().Component("CustomHero", Model.Attributes)>
    <div class="component-content">
      <section class="container component-hero" style="background-image: url(@Model.HeroImageSource)">
        <div class="hero-container">
          <div class="row">
            <div class="col-xs-12 col-sm-8">
              <div class="hero-title">
                <h1>@Html.Sitecore().Field("Title")</h1>
                <div class="row">
                    @foreach (BaseVariantField variantField in Model.VariantFields)
                    {
                      @Html.RenderingVariants().RenderVariant(variantField, Model.Item, Model.RenderingWebEditingParams, Model)
                    }
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
}
{% endhighlight %}

Now that we've replaced the CTA markup with the variant loop, we'll just create a rendering variant for our **CustomHero** rendering. This variant will contain **only** the NVelocity template [we created earlier]({{ site.baseurl }}/2019/The-SXA-Way-Using-NVelocity-Templates/) because the rendering variant will be injected directly where we placed our foreach loop.

![Partial-Rendering-Variant]({{ site.baseurl }}/images/posts/2019-04-05-The-SXA-Way-Custom-Rendering/PartialVariant.jpg){:class="img-responsive"}

And there you have it, you should be able to return to the experience editor and confirm that our new custom component with rendering variant is functioning correctly. While it's not immediately clear when this combined method will be preferred, it does allow our custom components to maintain some level of rendering variant functionality which I've found to be much more content author friendly as the number of variants begin to increase.