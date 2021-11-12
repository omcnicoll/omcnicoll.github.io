---
layout: post
comments: true
title:  "SXA Optimized Layout"
date:   2021-11-11 11:04:24 -0400
categories: Sitecore
tags: Sitecore-10 SXA Performance Optimization
---

Performance has been a common pain point in recent Sitecore projects, particularly when using SXA. While site performance might *seem* good, the increased popularity and ease of use of Lighthouse has made comparing sites and finding performance issues significantly easier. Vanilla SXA sites I've tested recently all start out in the 30-40/100 range which quite frankly is terrible. While this can be a neverending topic and 

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
 

## Conclusion
At the end of the day, I really enjoyed using SCS. My biggest pain points were the lack of built-in code generation and the GUI feeling lackluster in comparison to the TDS GUI, but they were minor enough. The improvements in speed and simplicity paid off in the long run. While it did take longer to setup than TDS, once setup was finished I never had to touch it again, whereas I always find myself fiddling with update options in TDS. I'll definitely be looking forward to SCS updated from Sitecore.