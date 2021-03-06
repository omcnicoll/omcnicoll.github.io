---
layout: post
comments: true
title:  "Sitecore 9 Service Cleanup"
date:   2019-03-29 11:04:24 -0400
categories: Sitecore
tags: Sitecore Performance
---
Congratulations, you've just completed your first (or more) installation of Sitecore 9! The site comes up, but you're noticing that your computer is running much slower than before. You take a quick look at your running services and notice java is taking up 90% of your CPU. What gives?

A huge culprit I've found, especially if you have multiple installations from different projects or perhaps failed installations, is that each installation will install three windows services.
- xconnect-MarketingAutomationService
- xconnect-ProcessingEngineService
- xconnect-IndexWorker

These will all be running automatically by default and drowning your processing power.

There are a few ways to fix this.
  1. Stop the service temporarily
  2. Delete the service

The first option is easier, however please note that you will need to change the startup type from **Automatic** to **Manual** as well, otherwise on computer restart the service will restart as well, bringing you to the same state of crippled performance.

The second option is preferred in the case of failed installations, or simply old sitecore instances, since the services will not be deleted automatically. To do so, simply find the name of the service, open a command prompt with administrator privileges, and execute the following command: `sc delete service_name`. This command should return a result message to alert you as to whether the delete was successful or not.

If this doesn't help your environment run faster or you have additional ideas to improve performance, leave a comment!