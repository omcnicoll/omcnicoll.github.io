---
layout: post
comments: true
title:  "SXA Optimized Layout"
date:   2021-11-12 11:04:24 -0400
categories: Sitecore
tags: Sitecore-10 SXA Performance Optimization
---

Performance has been a common pain point in recent Sitecore projects, particularly when using SXA. The increased popularity of [Lighthouse](https://developers.google.com/web/tools/lighthouse) has made finding performance issues significantly easier. Furthermore, by attaching a simple quantitative value, it has also made comparisons and goal-setting straightforward. With vanilla SXA sites I've tested recently, they all start out in the 30-40/100 range which is generally considered a failing grade. While this can be a never-ending topic, particularly if your goal is to reach the upper 90's, controlling the way your scripts and assets are loaded onto the page is almost always required.

In a regular site it's extremely easy to do, and in an SXA site it's also straightforward if you know the steps required. This post assumes you have a basic understanding of SXA and themes, which is the base method by which styles and scripts are injected into your pages.

## How it works out of the box

By default, all SXA pages use the MVC layout found under '/sitecore/layout/Layouts/Foundation/Experience Accelerator/MVC/MVC Layout'. Following the view path to /Views/SxaLayout/SxaLayout.cshtml, we find the following file:

{% highlight html %}
@using System.Web.Mvc.Html
@using Sitecore.Mvc
@using Sitecore.XA.Foundation.MarkupDecorator.Extensions
@using Sitecore.XA.Foundation.SitecoreExtensions.Extensions
@using Sitecore.XA.Foundation.Grid.Extensions
@using Sitecore.XA.Foundation.Theming.Bundler

@model Sitecore.Mvc.Presentation.RenderingModel

@{
    AssetLinks assetLinks = AssetLinksGenerator.GenerateLinks(new ThemesProvider());
}

<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!-->
<html class="no-js" lang="@Model.Item.Language.Name">
<!--<![endif]-->
<head>
    @foreach (string style in assetLinks.Styles)
    {
        @Html.Raw(style)
    }
    @Html.Sxa().VisitorIdentification()
    @Html.Sxa().Placeholder("head")
</head>
<body @Html.Sxa().Body().Decorate()>
    @Html.Sitecore().Placeholder("body-top")
    @Html.Sxa().GridBody()
    @Html.Sitecore().Placeholder("body-bottom")
    @foreach (string script in assetLinks.Scripts)
    {
        @Html.Raw(script)
    }
    <!-- /#wrapper -->
</body>
</html>
{% endhighlight%}

The line we're particularly interested in is:

{% highlight csharp %}
AssetLinks assetLinks = AssetLinksGenerator.GenerateLinks(new ThemesProvider());
{% endhighlight%}

This line sorts through all of the included Sitecore themes, compiles a list of all required scripts and styles (with markup wrapping included), and renders it out accordingly in the <head> and <body> sections further down. In this case, since we want to add attributes to the markup to defer or otherwise load these assets differently, we can take a look into Sitecore.XA.Foundation.Theming and build our own AssetLinksGenerator.

## Building custom OptimizedAssetLinkGenerator

Peeking into Sitecore.XA.Foundation.Theming.dll and navigating specifically to the AssetLinkGenerator class, we see a pretty straightforward implementation. This class is quite long so I will omit it from this post but if we look at all the methods, there's actually only 2 methods to update, and only 4 lines total. We'll be overriding the AddUrlInclude and Get Links methods.

{% highlight html %}
protected virtual void AddUrlInclude(UrlInclude urlInclude, AssetLinks result)
{
	if (urlInclude.Type == AssetType.Script)
	result.Scripts.Add("<script src=\"" + urlInclude.Url + "\"></script>");
	else
	result.Styles.Add("<link href=\"" + urlInclude.Url + "\" rel=\"stylesheet\" />");
}

protected virtual void GetLinks(
	IEnumerable<Item> allThemes,
	AssetServiceMode scriptsMode,
	AssetServiceMode stylesMode,
	AssetLinks result)
{
	foreach (Item allTheme in allThemes)
	{
	AssetLinks result1 = new AssetLinks();
	if (this._configuration.RequestAssetsOptimizationDisabled)
	{
		scriptsMode = AssetServiceMode.Disabled;
		stylesMode = AssetServiceMode.Disabled;
	}
	else
		this.GetAssetServiceModeFromTheme(ref scriptsMode, ref stylesMode, allTheme);
	this.GetScriptLinks(allTheme, scriptsMode, result1);
	this.GetStylesLinks(allTheme, stylesMode, result1);
	foreach (string str in result1.Styles.Select<string, string>((Func<string, string>) (link => "<link href=\"" + link + "\" rel=\"stylesheet\" />")))
		result.Styles.Add(str);
	foreach (string str in result1.Scripts.Select<string, string>((Func<string, string>) (link => "<script src=\"" + link + "\"></script>")))
		result.Scripts.Add(str);
	}
}
{% endhighlight%}

Look at the worst parts of the code highlighting and you might notice it's not hard to find the exact location where the markup is being built. All there is left to do is add any desired attributes to these tags.

## Creating and using new optimized layout

Once we have our custom OptimizedAssetLinkGenerator class created, all we need to do is make a copy of the original SxaLayout.cshtml view, update the AssetLinksGenerator to use our new class, and use the new layout on the base page standard values in Sitecore which should propagate to all the other page templates.

{% highlight html %}
@using System.Web.Mvc.Html
@using Sitecore.Mvc
@using Sitecore.XA.Foundation.MarkupDecorator.Extensions
@using Sitecore.XA.Foundation.SitecoreExtensions.Extensions
@using Sitecore.XA.Foundation.Grid.Extensions
@using Sitecore.XA.Foundation.Theming.Bundler

@model Sitecore.Mvc.Presentation.RenderingModel

@{
    AssetLinks assetLinks = OptimizedAssetLinksGenerator.GenerateLinks(new ThemesProvider());
}

<!DOCTYPE html>
<!--[if lt IE 7]>      <html class="no-js lt-ie9 lt-ie8 lt-ie7"> <![endif]-->
<!--[if IE 7]>         <html class="no-js lt-ie9 lt-ie8"> <![endif]-->
<!--[if IE 8]>         <html class="no-js lt-ie9"> <![endif]-->
<!--[if gt IE 8]><!-->
<html class="no-js" lang="@Model.Item.Language.Name">
<!--<![endif]-->
<head>
    @foreach (string style in assetLinks.Styles)
    {
        @Html.Raw(style)
    }
    @Html.Sxa().VisitorIdentification()
    @Html.Sxa().Placeholder("head")
</head>
<body @Html.Sxa().Body().Decorate()>
    @Html.Sitecore().Placeholder("body-top")
    @Html.Sxa().GridBody()
    @Html.Sitecore().Placeholder("body-bottom")
    @foreach (string script in assetLinks.Scripts)
    {
        @Html.Raw(script)
    }
    <!-- /#wrapper -->
</body>
</html>
{% endhighlight%}

 The result is the ability to implement custom logic for rendering code from SXA themes and (hopefully) a step in the right direction for better performance!

