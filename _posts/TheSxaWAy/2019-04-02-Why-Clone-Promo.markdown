---
layout: post
comments: true
title:  "Why Does Everyone Clone Promo?"
date:   2019-04-02 11:00:24 -0400
categories: Sitecore
---
If you've done any custom SXA development, you'll know that the first step to creating a custom rendering is to clone the promo component. *What's so special about the Promo?* you may be asking yourself, and I'm here to tell you. To best understand why, we'll take a look at what the Promo view looks like.


![Ootb-Promo-View]({{ site.baseurl }}/images/posts/2019-04-02-Why-Clone-Promo/PromoView.jpg){:class="img-responsive"}

You might be looking at this view and wondering where the promo component is actually rendered, and I would point you to line 20. Everything else in this view is just generic sorrounding markup for SXA components, absolutely nothing specifc to the promo component itself. Line 20 is where all the magic happens. The `RenderVariant` method renders all of the markup which you have defined **in Sitecore** under the item-name-matched rendering variant folder. The result? The promo view is as generic as it gets, with all component specific markup stored in Sitecore, making it the ideal component to use as the basis for cloning.

If you don't quite understand rendering variants, look out for my upcoming blogpost explaining what they are! In the meantime, the oversimplification of rendering variants is that they are sitecore items that represent HTML nodes and Sitecore fields, which you can use to create and modify markup for components from within Sitecore, no coding needed!