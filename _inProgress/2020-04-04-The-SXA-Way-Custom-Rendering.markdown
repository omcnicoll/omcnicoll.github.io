---
layout: post
comments: true
title:  "The SXA Way | Creating A Custom Rendering"
date:   2019-04-04 11:04:24 -0400
categories: Sitecore
---
Now that we've explored the building blocks of creating SXA components without touching any code, what if for some reason you absolutely cannot create your component with rendering variants? In that case, we still have the option of writing custom components from scratch, it just takes a few more steps than it traditionally would. Let's take a look at how we would do this.


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


![NVelocity-Rendering-Variant]({{ site.baseurl }}/images/posts/2019-04-04-The-SXA-Way-Advanced-Rendering-Variants/NewVariant.jpg){:class="img-responsive"}
