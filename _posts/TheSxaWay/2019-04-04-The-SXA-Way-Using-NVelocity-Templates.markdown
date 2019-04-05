---
layout: post
comments: true
title:  "The SXA Way | Using NVelocity Templates"
date:   2019-04-04 11:04:24 -0400
categories: Sitecore
---
Now that we've seen how to render multilists using reference items, and we've also seen the amount of extra markup it creates, lets take a look at the other option for generating more complex markup within rendering variants: NVelocity templates. Before we begin though, there are a few important points I'd like to note.

1. There is no way (as far as I know) to actively debug NVelocity templates in Sitecore
2. I have found very limited documentation and examples on using NVelocity in SXA
3. While you can accomplish a tremendous amount by default, we will need to get our hands dirty and code for this example

As usual, lets start with an analysis of what we need to accomplish. All we're really trying to generate with our template is an anchor tag for each item. For difficulties sake, lets say the text being displayed within the anchor tags also needs to be wrapped in a span tag. Why? Because that's what the imaginary designs require, and its not possible to implement without an NVelocity template.

{% highlight html %}
<a class="hero-cta-link" href="CTALinkUrl">
    <span>CTALinkTitle</span>
</a>
<a class="hero-cta-link" href="CTALinkUrl">
    <span>CTALinkTitle</span>
</a>
<a class="hero-cta-link" href="CTALinkUrl">
    <span>CTALinkTitle</span>
</a>
{% endhighlight %}


As a quick recap, lets take a quick look at some basic functionality:
{% highlight html %}
<!--You can access field values by using any of these methods-->
$item.CTALinks
$item.Fields.CTALinks
$item.Fields.get_Item("CTALinks")
<!--You can set basic conditional statements-->
#if ($item.Title == "")
    <p>There is no title</p>
#elseif ($item.Title != "")
    <h1>$item.Title</h1>
#else
    <h1>Final else statement</h1>
#end
<!--You can also loop through collections with foreach statements-->
#foreach($child in $item.Children)
  $child.Name
#end
{% endhighlight %}
*Apologies if its hard to read, I haven't looked into overriding the default rouge highlighting or adding a specific NVelocity language highlighter*

With that quick review complete, these links look easy to do! We'll just do a foreach, loop through the CTALink items, and create the anchor tag for each of them, right? Nope. When we loop through the $item.CTALinks field, we're not actually looping through the collection of items, we're looping through the raw value string, which means every iteration of the foreach is for a letter, not an item. Additionally, even if we were able to get the link items, we wouldn't be able to access the target URL and link description seperately. The solution to all of this? We will write our own custom token replacement methods.


To get an idea for what methods we want to write, lets think about the three things we've just decided we're missing.
1. Given a multilist field, we need to retrieve a collection sitecore items
2. Given an item with a general link field, we need to retrieve its target URL
3. Given an item with a general link field, we need to retrieve its title


We're going to go ahead and write three different methods to address each of these needs. In the same feature project where we should be keeping the view for our hero, I'll make a new directory called `Processors` and create an `AddTemplateRenderers` file inside. That file will contain the following code to create the custom token replacement methods and add them to the NVelociy token renderers.
{% highlight csharp %}
using Sitecore.XA.Foundation.SitecoreExtensions.Extensions;
using Sitecore.XA.Foundation.Variants.Abstractions.Pipelines.GetVelocityTemplateRenderers;
using Sitecore.Data.Items;
using System.Collections.Generic;

namespace Project.Feature.XA.Hero.Processors
{
  public class AddTemplateRenderers : IGetTemplateRenderersPipelineProcessor
  {
    public void Process(GetTemplateRenderersPipelineArgs args)
    {
      args.Context.Put("fieldTokens", new CustomTokens());
    }
  }

  public class CustomTokens
  {
    //Will return link to the item passed in, or general links target URL if fieldName is passed in as well
    public static string GetLink(Item item, string fieldName = null)
    {
      string value = string.Empty;
      if (item != null)
      {
        if (!string.IsNullOrEmpty(fieldName))
        {
          var field = item.Fields[fieldName];
          if (field != null && field.Type == "General Link")
          {
            Sitecore.Data.Fields.LinkField link = field;
            value = link.GetFriendlyUrl();
          }
        }
        else
        {
          value = ItemExtensions.GetItemUrl(item);
        }
      }
      return value;
    }


    //Will return general link fields text
    public static string GetGeneralLinkText(Item item, string fieldName = null)
    {
      string value = string.Empty;
      if (item != null)
      {
        if (!string.IsNullOrEmpty(fieldName))
        {
          var field = item.Fields[fieldName];
          if (field != null && field.Type == "General Link")
          {
            Sitecore.Data.Fields.LinkField link = field;
            value = link.Text;
          }
        }
      }
      return value;
    }

    //Will return a list of items when given a multilist type field
    public static List<Item> GetLinkItems(Item item, string fieldName = null)
    {
      List<Item> result = new List<Item>();
      if (item != null)
      {
        if (!string.IsNullOrEmpty(fieldName))
        {
          var field = item.Fields[fieldName];
          if (field != null)
          {
            if (field.Type.Contains("Multilist"))
            {
              Sitecore.Data.Fields.MultilistField multilist = field;
              foreach (var linkItem in multilist.Items)
              {
                result.Add(item.Database.GetItem(Sitecore.Data.ID.Parse(linkItem)));
              }
            }
          }
        }
      }
      return result;
    }

  }
}
{% endhighlight%}


After the processors code has been written, we will need to patch our new template rendering processor into the velocity template renderer pipeline. For this we'll create a new config file in our hero project with the following code:


{% highlight xml %}
<?xml version="1.0"?>
<configuration xmlns:patch="http://www.sitecore.net/xmlconfig/">
  <sitecore>
    <pipelines>
      <getVelocityTemplateRenderers>
        <processor type="Project.Feature.XA.Hero.Processors.AddTemplateRenderers, Project.Feature.XA.Hero"
                   patch:after="processor[@type='Sitecore.XA.Foundation.Variants.Abstractions.Pipelines.GetVelocityTemplateRenderers.GetVelocityTemplateRenderers, Sitecore.XA.Foundation.Variants.Abstractions']"  />
      </getVelocityTemplateRenderers>
    </pipelines>
  </sitecore>
</configuration>
{% endhighlight %}


Now all that's left to do is publish and test these new custom token replacements. To access each of these methods, or any other method you create, you simply need to use `$fieldTokens.MethodName(parameters)`. With that in mind, let's head back to our rendering variant.
1. Delete the CTA Link variant reference and all it's children
2. Delete the div with col-12 as well. We'll just add this class on the NVelocity template wrapper
3. In its place, right click and insert a VariantTemplate item
4. Leave thet tag as `div` and add the `col-12` class
5. In the template field, we'll insert the following code utilizing our new token replacement methods

{% highlight html %}
#foreach($link in $fieldTokens.GetLinkItems($item, "CTALinks"))
    <a href="$fieldTokens.GetLink($link, "Link")" class="hero-cta-link">
        <span>
            $fieldTokens.GetGeneralLinkText($link, "Link")
        </span>
    </a>
#end
{% endhighlight %}


![NVelocity-Rendering-Variant]({{ site.baseurl }}/images/posts/2019-04-04-The-SXA-Way-Advanced-Rendering-Variants/NewVariant.jpg){:class="img-responsive"}


Now let's head back and see what markup gets generated.


![NVelocity-CTA-Markup]({{ site.baseurl }}/images/posts/2019-04-04-The-SXA-Way-Advanced-Rendering-Variants/VelocityCta.jpg){:class="img-responsive"}


This looks significantly cleaner than the markup generated by the reference items and matches our original markup perfectly! We could argue that the end result looks the same and it just took a lot more work, but the key takeaway is the potential that NVelocity unleashes within rendering variants. Additionally, while we do need to invest startup time creating these helper methods, thay can be shared across all components. You could even create a foundation level project to store a token replacement library, and with proper method naming, for all future variants NVelocity templates would require no additional work. In the end though, as with most comparisons, it's a tradeoff of simplicity vs customization, and whichever method you choose is a game day decision based off each unique situation.