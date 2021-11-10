---
layout: post
comments: true
title:  "Sitecore Content Serialization With Code Generation"
date:   2021-11-10 11:04:24 -0400
categories: Sitecore
tags: Sitecore-10 SCS Sitecore-Content-Serialization CodeGen Code-Generation
---
A bit over a year ago Sitecore released version 10.0. Amongst a long list of updates, the largest one which caught my eye was the addition of SCS (Sitecore Content Serialization) which was released as an alternate option to TDS or Unicorn. This caught my eye mainly because I hoped it would offer a better, easier solution to serialization and codegen out of the box. After implementing a solution based off this technology in the months directly after the release and maintaining the solution for over a year, lets take a look back at what we implemented and how it stacks up. * *This information is all from Sitecore 10.0. Updates may have come out in the time since then, and I will happily correct anything if notified.*

## SCS Overview 

###  Expectations:
- Best of both TDS and Unicorn
    - Easy to use GUI with SVS
    - Easier setup than Unicorn
    - Faster deployments than TDS
    - Easy and reliable automation with Sitecore CLI
- Missing functionalities
	- File deployments
	- WDP generation
	- Code generation (we implement a custom method)

### Acronyms:

 **SCS – Sitecore Content Serialization**
- New serialization option available with Sitecore 10 out of the box

**Sitecore CLI**
- Out of the box command line interface to leverage SCS
- When using SCS with Sitecore CLI, this option is free and does not require a license

 **SVS – Sitecore for Visual Studio**
- Visual Studio extension that is an optional addition for SCS
- Provides a friendlier GUI for more precise item syncing with Sitecore
- **Requires a TDS license to enable** – there is currently no standalone license
  

The key information to take away here is that this feature is free only if you use the CLI exclusively. While Sitecore claims the CLI has feature parity with SVS, and that might be technically true, I found it much harder to be granular and direct with updates using only the CLI. More on that later.

## Setup
I'll be brief with the basics throughout this post. For in-depth information on setup and anything basic, [I will direct you to Sitecore's own documentation](https://doc.sitecore.com/en/developers/100/developer-tools/sitecore-content-serialization-structural-overview.html)

That being said, the golden rule of setup with SCS is that each item must only be serialized in a single location. This is very important because whereas in TDS you can include TDS projects in plop templates to blindly include items, knowing it will include all parent items every time, SCS will scream if the parent items don't already exist, or if they get serialized more than once. As a result, we had to be more careful when setting up the module.json files.

My solution was to have a "layer.common" module.json for each layer which would make sure the project specific folders were present and created a single time, then include "layer.feature" module.json files in each helix project. Hopefully this image helps clarify what folders come out of the box, what I include in the common modules, and what is included in each feature module.

![ModulesSetupExample]({{ site.baseurl }}/images/posts/2021-11-10-Sitecore-SCS-CodeGen/ModulesSetupExample.png){:class="img-responsive"}

Once I worked out that basic rule, I simply added the generic module.json to our plop templates and never thought about setup or configuration again.

![modulesJsonPlop]({{ site.baseurl }}/images/posts/2021-11-10-Sitecore-SCS-CodeGen/modulesJsonPlop.png){:class="img-responsive"}

 In summary I would say it's definitely more difficult to setup than TDS (which doesn't really need anything), but much easier than my memory of Unicorn.
 
## Ease of use
I found SCS to be *ok* to use. The CLI gets messy in larger teams due to the inability to sync single items (as far as I know). This results in entire modules getting synced and opens the door for accidental overwrites. Can this be avoided if you're careful? Yes. Is everyone always careful? No.

I also found the GUI to be not as user friendly when compared with the TDS GUI, mainly because you must choose either the 'push' window or the 'pull' window. I can't go through each item and select which direction to push updates in a single window, I need to push all updates first, then pull all updates afterwards. This is definitely a minor annoyance, but an annoyance nonetheless.

## Code Generation
The original decision to use SCS came from a place of curiosity and was rather quick, however that decision was put to the test a few days later. While I have switched from using Glass Mapper to greatly preferring an "ORM-less" approach, we still have a heavy reliance on code generation. The Sitecore API's are terrific and easy to use, but can quickly become messy without it, and SCS does not support code generation. Yet (hopefully). In the meantime, we couldn't wait, so we implemented a different solution. *I also believe Leprechaun now supports SCS for code gen, which may be a better approach, although still increasing your dependencies on other software.*

Luckily I had a reference point of another blog post, [I believe this one](https://vohil.net/2020/08/10/sitecore-10-sitecore-content-serialization/), to point me in the right direction. What I ended up doing:
- Use old Unicorn.t4 template as a starting point
- Replicate helper methods from .t4 file in custom CodeGeneration class, using Sitecore.Data.Serialization.Yaml.YamlItemSerializer to read the SCS files in the GetTemplateData method.
{% highlight csharp %}
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Sitecore.Abstractions.Serialization;
using Sitecore.Data.Serialization.Yaml;
using Sitecore.Data.Serialization.Yaml.Formatting;

			public class SitecoreCodeGenerator
{
	private readonly IEnumerable<string> pathsToTemplates;
	private readonly IEnumerable<BaseFieldFormatter> fieldFormatters;

	public SitecoreCodeGenerator(IEnumerable<string> pathsToTemplates, IEnumerable<BaseFieldFormatter> fieldFormatters = null)
	{
		if (fieldFormatters == null)
		{
			// fallback to the default formatters set from Sitecore 10 initial release
			fieldFormatters = new BaseFieldFormatter[]
			{
				new XmlFieldFormatter(),
				new MultilistFormatter(),
				new CheckboxFieldFormatter()
			};
		}

		this.pathsToTemplates = pathsToTemplates;
		this.fieldFormatters = fieldFormatters;
	}

	public virtual string GetClassName(IItemData template)
	{
		return this.AsValidWord(template.Name);
	}

	public virtual string GetExtendedNamespace(IItemData template)
	{
		var pathNames = template.Path.Split('/');
		var templateFolderName = pathNames.ElementAt(pathNames.Length - 2);
		return string.Format(".Templates.{0}",this.AsValidWord(templateFolderName));
	}

	public virtual string GetFieldName(IItemData field)
	{
		return this.AsValidWord(field.Name);
	}

	public virtual string TitleCase(string word)
	{
		word = Regex.Replace(word, "([a-z](?=[A-Z])|[A-Z](?=[A-Z][a-z]))", "$1+");
		word = System.Globalization.CultureInfo.InvariantCulture.TextInfo.ToTitleCase(word);
		word = word.Replace("+", "");
		return word;
	}

	public virtual bool IsRenderingParameters(IItemData template)
	{
		return template.SharedFields.First(
				f => f.FieldId == new Guid("{12C33F3F-86C5-43A5-AEB4-5598CEC45116}")).Value
			.Contains("{8CA06D6A-B353-44E8-BC31-B528C7306971}");
	}

	public virtual string GetFieldType(IItemData field)
	{
		return field.SharedFields.First(f => f.FieldId == new Guid("{AB162CC0-DC80-4ABF-8871-998EE5D7BA32}")).Value.ToLowerInvariant();
	}

	public virtual string AsValidWord(string part)
	{
		part = this.TitleCase(part);
		part = part.Replace(" ", "");
		part = part.Replace("-", "");
		while (Regex.IsMatch(part, "^\\d"))
		{
			part = Regex.Replace(part, "^1", "One");
			part = Regex.Replace(part, "^2", "Two");
			part = Regex.Replace(part, "^3", "Three");
			part = Regex.Replace(part, "^4", "Four");
			part = Regex.Replace(part, "^5", "Five");
			part = Regex.Replace(part, "^6", "Six");
			part = Regex.Replace(part, "^7", "Seven");
			part = Regex.Replace(part, "^8", "Eight");
			part = Regex.Replace(part, "^9", "Nine");
		}
		return part;
	}

	public virtual IReadOnlyCollection<TemplateData> GetTemplateData()
	{
		var files = this.pathsToTemplates.SelectMany(x => Directory.EnumerateFiles(x, "*.yml", SearchOption.AllDirectories));

		var items = new List<IItemData>();

		var factory = new StaticFieldFormattersFactory(this.fieldFormatters);
		var serializer = new YamlItemSerializer(factory);
		foreach (var file in files)
		{
			using (TextReader reader = new StreamReader(file))
			{
				var item = serializer.Read(reader);
				items.Add(item);
			}
		}

		var itemsLookup = items.ToLookup(x => x.ParentId, x => x);

		var templates = items
			.Where(x => x.TemplateId == Sitecore.TemplateIDs.Template.Guid)
			.Where(x => x.Name != "$name");

		return templates.Select(template => new TemplateData
		{
			Template = template,
			Fields = this.GetFields(template.Id, itemsLookup)
		}).ToArray();
	}

	public virtual IList<IItemData> GetSections(Guid templateId, ILookup<Guid, IItemData> lookup)
	{
		return lookup[templateId].Where(x => x.TemplateId == Sitecore.TemplateIDs.TemplateSection.Guid).ToList();
	}

	public virtual IList<IItemData> GetFields(Guid templateId, ILookup<Guid, IItemData> lookup)
	{
		var sectionIds = this.GetSections(templateId, lookup).Select(x => x.Id);
		return sectionIds.SelectMany(x => lookup[x].Where(item => item.TemplateId == Sitecore.TemplateIDs.TemplateField.Guid).ToList()).ToList();
	}
}

public class TemplateData
{
	public IItemData Template { get; set; }
	public IEnumerable<IItemData> Fields { get; set; }
}
{% endhighlight%}
- Build factory and mocked configuration factory as dependencies to use the YamlItemSerializer. (Factory ommitted here for brevity, but is just a class inheriting Sitecore.Abstractions.BaseFactory with every method not implemented.)
{% highlight csharp %}
using System.Collections.Generic;
using Sitecore.Data.Serialization.Yaml.Formatting;

public class StaticFieldFormattersFactory : FieldFormattersFactory
{
	private readonly IEnumerable<BaseFieldFormatter> formatters;

	public StaticFieldFormattersFactory(IEnumerable<BaseFieldFormatter> formatters)
		: base(new MockedConfigurationFactory())
	{
		this.formatters = formatters;
	}

	public override IEnumerable<BaseFieldFormatter> Create()
	{
		return this.formatters;
	}
}
{% endhighlight%}
- Replace Rainbow.Storage.Yaml.YamlSerializationFormatter from original t4 with references to the new custom code and place at solution root (Apologies for terrible highlighting)
{% highlight shell %}
<#@ assembly name="$(SolutionDir)packages\Sitecore.Kernel\10.0.0\lib\NET48\Sitecore.Kernel.dll" #>
<#@ assembly name="$(SolutionDir)lib\Project.Foundation.CodeGeneration.dll" #>
<#@ assembly name="System.Core" #>
<#@ assembly name="System.Xml" #>
<#@ import namespace="Project.Foundation.CodeGeneration" #>
<#@ import namespace="System.Collections.Generic" #>
<#@ import namespace="System.Linq" #>
<#@ import namespace="Sitecore.Data.Serialization.Yaml.Formatting" #>
using Sitecore.Data;
using Sitecore.Data.Items;
<# 
// default formatters set from Sitecore 10 initial release, check <fieldFormatters> configuration node in your Sitecore instance.
var formatters = new BaseFieldFormatter[]
{
	new XmlFieldFormatter(),
	new MultilistFormatter(),
	new CheckboxFieldFormatter()
};
var gen = new SitecoreCodeGenerator(Configurations, formatters);
try 
{ 
	foreach (var data in gen.GetTemplateData()) 
	{ 
		var template = data.Template; 
		var fields = data.Fields;
#>

#region <#=template.Path#>

namespace <#=BaseNamespace#><#=gen.GetExtendedNamespace(template)#>
{
	/// <summary>
	/// Item wrapper for items of template '<#=template.Name#>'.
	/// Template ID: <#=template.Id.ToString("B").ToUpper()#>.
	/// Template path: <#=template.Path#>.
	/// </summary>
	public partial class <#=gen.GetClassName(template)#>
	{
		public <#=gen.GetClassName(template)#>(Item item)
		{
		}

		public static class Constants
		{
			public static readonly TemplateID TemplateId = new TemplateID(new ID(TemplateIdString));
			public const string TemplateIdString = "<#=template.Id.ToString("B").ToUpper()#>"; 
		}

<#  if (fields.Any()) { #>
		public static class FieldNames
		{
<#foreach(var field in fields) { #>
			public const string <#=gen.GetFieldName(field)#> = "<#=field.Name#>"; 
<#}#>
		}
<# } #>
<#  if (fields.Any()) { #>

		public static class FieldIds
		{
<#foreach(var field in fields) { #>
			public static ID <#=gen.GetFieldName(field)#> = new ID("<#=field.Id.ToString("B").ToUpper()#>"); 
<#}#>
		}
<# } #>
	}
}

#endregion
<# } 
} catch{} #>
<#+
private string BaseNamespace { get; set; }  
private IEnumerable<string> Configurations { get; set; }#>
{% endhighlight %}
- And finally include the barebones .tt in every project. (Again apologies for terrible highlighting)
{% highlight shell %}
<#@ template debug="true" hostspecific="true" language="C#" #><#@ output extension=".cs" encoding="utf-8" #>
<#
BaseNamespace = System.Runtime.Remoting.Messaging.CallContext.LogicalGetData("NamespaceHint").ToString();
var solutionPath = this.Host.ResolveAssemblyReference("$(SolutionDir)");  
var projectPath = Host.ResolvePath(this.Host.ResolveAssemblyReference("$(ProjectDir)") + "..\\serialization\\Templates");
Configurations = new string[]  
{
projectPath
};#><#@ include file= "..\..\..\..\..\Code Generation\CodeGeneration.tt" #>
{% endhighlight %}

The result was perfect code generation! The barebones .tt file was included in plop templates and successfully generated my desired constants for every feature. Maybe not perfect, we did need to run the custom tool manually after every serialization update, but that is a minor issue. 

## Deployments
Again glossing over the basics, I found deployments to be very easy. By avoiding the mystery of dropping TDS packages in file systems and replacing that process with a simple CLI command to install packages, I found the process to be much faster in addition to being much easier to track. In my case, I also split my serialization into two separate packages - "data" and "content". The difference was a single module.json for Project.Content which included test content, so that I could deploy all necessary items *with* content to a development environment, and omit all the test content for higher environments. With the CLI, this was very easy.

One with everything EXCEPT demo content for dev
- dotnet sitecore ser pkg create -e Project.Content -o project-data

One with ONLY demo content for dev
- dotnet sitecore ser pkg create -i  Project.Content -o project-content

## Known Issues
During this implementation I did find a few issues:

- Installing an update package to update the blob value on a media item will corrupt the blob and render the item unusable (Especially bad for SXA themes)
	- Workaround is to install a package to delete the media item before installing so it’s a create vs update

- Installing item packages fails silently most of the time and can be unexpected.
	- Highly recommend using –t flag for trace when installing packages for deployments to show every single change and whether or not it worked. It will still fail silently, but you can at least see what’s wrong. Need to investigate how to make it throw errors properly
	- Does not slow down much at all, packages still take ~15-30 seconds to install

## Conclusion
At the end of the day, I really enjoyed using SCS. My biggest pain points were the lack of built-in code generation and the GUI feeling lackluster in comparison to the TDS GUI, but they were minor enough. The improvements in speed and simplicity paid off in the long run. While it did take longer to setup than TDS, once setup was finished I never had to touch it again, whereas I always find myself fiddling with update options in TDS. I'll definitely be looking forward to SCS updated from Sitecore.