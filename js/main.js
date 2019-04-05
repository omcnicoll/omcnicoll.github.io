---
layout: null
sitemap:
  exclude: 'yes'
---

$(document).ready(function () {
  $('.main-post-list').hide()
  $('.whoami').hide()
  $('a.blog-button').click(function (e) {
    if ($('.panel-cover').hasClass('panel-cover--collapsed')) return
    currentWidth = $('.panel-cover').width()
    if (currentWidth < 960) {
      $('.panel-cover').addClass('panel-cover--collapsed')
      $('.content-wrapper').addClass('animated slideInRight')
    } else {
      $('.panel-cover').css('max-width', currentWidth)
      $('.panel-cover').animate({'max-width': '530px', 'width': '40%'}, 400, swing = 'swing', function () {})
    }
  })

  if (window.location.hash) {
    if(window.location.hash == '#blog'){
      $('.panel-cover').addClass('panel-cover--collapsed')
      $('.main-post-list').show()
      $('.whoami').hide()
    }
    if(window.location.hash == '#whoami'){
      $('.panel-cover').addClass('panel-cover--collapsed')
      $('.main-post-list').hide()
      $('.whoami').show()
    }
  }
  if((window.location.pathname.split('/').length > 3) || window.location.pathname.includes('tags')){
    $('.base-nav').hide()
    $('.post-nav').show()
  }

  if(document.referrer.includes('{{ site.url }}')){
    $('.referrer-back-link').attr("href", document.referrer + '#blog')
    $('.referrer-back-link').show()
  }

  if (window.location.pathname !== '{{ site.baseurl }}/' && window.location.pathname !== '{{ site.baseurl }}/index.html') {
    $('.panel-cover').addClass('panel-cover--collapsed')
  }

  $('.btn-mobile-menu').click(function () {
    $('.navigation-wrapper').toggleClass('visible animated bounceInDown')
    $('.btn-mobile-menu__icon').toggleClass('icon-list icon-x-circle animated fadeIn')
  })

  $('.navigation-wrapper .blog-button').click(function () {
    $('.navigation-wrapper').toggleClass('visible')
    $('.btn-mobile-menu__icon').toggleClass('icon-list icon-x-circle animated fadeIn')
  })

})

$(window).on('hashchange', function() {
  if (window.location.hash) {
    if(window.location.hash == '#blog'){
      $('.panel-cover').addClass('panel-cover--collapsed')
      $('.whoami').fadeOut("slow",function(){
        $('.main-post-list').fadeIn()
      });
    }
    if(window.location.hash == '#whoami'){
      $('.panel-cover').addClass('panel-cover--collapsed')
      $('.main-post-list').fadeOut("slow",function(){
        $('.whoami').fadeIn()
      });
    }
  }
  else{
    $('.panel-cover').removeClass('panel-cover--collapsed')
  }
});