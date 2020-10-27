
// Helper functions
function replaceUrlParam(url, paramName, paramValue) {
  var pattern = new RegExp('('+paramName+'=).*?(&|$)'),
      newUrl = url;
  if (url.search(pattern) >= 0) {
    newUrl = url.replace(pattern,'$1' + paramValue + '$2');
  } else {
    newUrl = newUrl + (newUrl.indexOf('?')>0 ? '&' : '?') + paramName + '=' + paramValue;
  }
  return newUrl;
}
// Callback for image loading based on Paul Irish method
$.fn.imagesLoaded = function(callback, fireOne) {
var
  args = arguments,
  elems = this.filter('img'),
  elemsLen = elems.length - 1;
elems
  .bind('load', function(e) {
      if (fireOne) {
          !elemsLen-- && callback.call(elems, e);
      } else {
          callback.call(this, e);
      }
  }).each(function() {
    // cached images don't fire load sometimes, so we reset src.
    if (this.complete || this.complete === undefined){
        this.src = this.src;
    }
  });
}


window.slate = window.slate || {};

/**
 * A11y Helpers
 * -----------------------------------------------------------------------------
 * A collection of useful functions that help make your theme more accessible
 * to users with visual impairments.
 *
 *
 * @namespace a11y
 */

slate.a11y = {
  /**
   * For use when focus shifts to a container rather than a link
   * eg for In-page links, after scroll, focus shifts to content area so that
   * next `tab` is where user expects if focusing a link, just $link.focus();
   *
   * @param {JQuery} $element - The element to be acted upon
   */
  pageLinkFocus: function($element) {
    var focusClass = 'js-focus-hidden';

    $element
      .first()
      .attr('tabIndex', '-1')
      .focus()
      .addClass(focusClass)
      .one('blur', callback);

    function callback() {
      $element
        .first()
        .removeClass(focusClass)
        .removeAttr('tabindex');
    }
  },

  /**
   * If there's a hash in the url, focus the appropriate element
   */
  focusHash: function() {
    var hash = window.location.hash;

    // is there a hash in the url? is it an element on the page?
    if (hash && document.getElementById(hash.slice(1))) {
      this.pageLinkFocus($(hash));
    }
  },

  /**
   * When an in-page (url w/hash) link is clicked, focus the appropriate element
   */
  bindInPageLinks: function() {
    $('a[href*=#]').on(
      'click',
      function(evt) {
        this.pageLinkFocus($(evt.currentTarget.hash));
      }.bind(this)
    );
  },

  /**
   * Traps the focus in a particular container
   *
   * @param {object} options - Options to be used
   * @param {jQuery} options.$container - Container to trap focus within
   * @param {jQuery} options.$elementToFocus - Element to be focused when focus leaves container
   * @param {string} options.namespace - Namespace used for new focus event handler
   */
  trapFocus: function(options) {
    var eventsName = {
      focusin: options.namespace ? 'focusin.' + options.namespace : 'focusin',
      focusout: options.namespace
        ? 'focusout.' + options.namespace
        : 'focusout',
      keydown: options.namespace
        ? 'keydown.' + options.namespace
        : 'keydown.handleFocus'
    };

    /**
     * Get every possible visible focusable element
     */
    var $focusableElements = options.$container.find(
      $(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex^="-"])'
      ).filter(':visible')
    );
    var firstFocusable = $focusableElements[0];
    var lastFocusable = $focusableElements[$focusableElements.length - 1];

    if (!options.$elementToFocus) {
      options.$elementToFocus = options.$container;
    }

    function _manageFocus(evt) {
      if (evt.keyCode !== slate.utils.keyboardKeys.TAB) return;

      /**
       * On the last focusable element and tab forward,
       * focus the first element.
       */
      if (evt.target === lastFocusable && !evt.shiftKey) {
        evt.preventDefault();
        firstFocusable.focus();
      }
      /**
       * On the first focusable element and tab backward,
       * focus the last element.
       */
      if (evt.target === firstFocusable && evt.shiftKey) {
        evt.preventDefault();
        lastFocusable.focus();
      }
    }

    options.$container.attr('tabindex', '-1');
    options.$elementToFocus.focus();

    $(document).off('focusin');

    $(document).on(eventsName.focusout, function() {
      $(document).off(eventsName.keydown);
    });

    $(document).on(eventsName.focusin, function(evt) {
      if (evt.target !== lastFocusable && evt.target !== firstFocusable) return;

      $(document).on(eventsName.keydown, function(evt) {
        _manageFocus(evt);
      });
    });
  },

  /**
   * Removes the trap of focus in a particular container
   *
   * @param {object} options - Options to be used
   * @param {jQuery} options.$container - Container to trap focus within
   * @param {string} options.namespace - Namespace used for new focus event handler
   */
  removeTrapFocus: function(options) {
    var eventName = options.namespace
      ? 'focusin.' + options.namespace
      : 'focusin';

    if (options.$container && options.$container.length) {
      options.$container.removeAttr('tabindex');
    }

    $(document).off(eventName);
  },

  /**
   * Add aria-describedby attribute to external and new window links
   *
   * @param {object} options - Options to be used
   * @param {object} options.messages - Custom messages to be used
   * @param {jQuery} options.$links - Specific links to be targeted
   */
  accessibleLinks: function(options) {
    var body = document.querySelector('body');

    var idSelectors = {
      newWindow: 'a11y-new-window-message',
      external: 'a11y-external-message',
      newWindowExternal: 'a11y-new-window-external-message'
    };

    if (options.$links === undefined || !options.$links.jquery) {
      options.$links = $('a[href]:not([aria-describedby])');
    }

    function generateHTML(customMessages) {
      if (typeof customMessages !== 'object') {
        customMessages = {};
      }

      var messages = $.extend(
        {
          newWindow: 'Opens in a new window.',
          external: 'Opens external website.',
          newWindowExternal: 'Opens external website in a new window.'
        },
        customMessages
      );

      var container = document.createElement('ul');
      var htmlMessages = '';

      for (var message in messages) {
        htmlMessages +=
          '<li id=' + idSelectors[message] + '>' + messages[message] + '</li>';
      }

      container.setAttribute('hidden', true);
      container.innerHTML = htmlMessages;

      body.appendChild(container);
    }

    function _externalSite($link) {
      var hostname = window.location.hostname;

      return $link[0].hostname !== hostname;
    }

    $.each(options.$links, function() {
      var $link = $(this);
      var target = $link.attr('target');
      var rel = $link.attr('rel');
      var isExternal = _externalSite($link);
      var isTargetBlank = target === '_blank';

      if (isExternal) {
        $link.attr('aria-describedby', idSelectors.external);
      }
      if (isTargetBlank) {
        if (rel === undefined || rel.indexOf('noopener') === -1) {
          $link.attr('rel', 'noopener');
        }
        $link.attr('aria-describedby', idSelectors.newWindow);
      }
      if (isExternal && isTargetBlank) {
        $link.attr('aria-describedby', idSelectors.newWindowExternal);
      }
    });

    generateHTML(options.messages);
  }
};


// Timber functions
window.timber = window.timber || {};

timber.cacheSelectors = function () {
  timber.cache = {
    // General
    $html                    : $('html'),
    $body                    : $('body'),

    // Navigation
    $navigation              : $('.accessibleNav'),
    $mobilenav               : $('.mobileNav'),

    // Collection Pages
    $changeView              : $('.change-view'),

    // Product Page
    $productImage            : $('#ProductPhotoImg'),
    $thumbImages             : $('#ProductThumbs, #ProductThumbsSide').find('a.product-single__thumbnail'),

    // Customer Pages
    $recoverPasswordLink     : $('#RecoverPassword'),
    $hideRecoverPasswordLink : $('#HideRecoverPasswordLink'),
    $recoverPasswordForm     : $('#RecoverPasswordForm'),
    $customerLoginForm       : $('#CustomerLoginForm'),
    $passwordResetSuccess    : $('#ResetSuccess')
  }
};

timber.init = function () {

  timber.cacheSelectors();
  timber.accessibleNav();
  timber.mobileNav().init();
  timber.flyoutSearch().initialize();
  timber.responsiveVideos();
  timber.collectionViews();
  timber.loginForms();
};


timber.accessibleNav = function () {
  var $nav = timber.cache.$navigation,
      $allLinks = $nav.find('a'),
      $topLevel = $nav.children('li').find('a'),
      $parents = $nav.find('.site-nav--has-dropdown'),
      $subMenuLinks = $nav.find('.site-nav__dropdown').find('a'),
      activeClass = 'nav-hover',
      focusClass = 'nav-focus';

  // Mouseenter
  $parents.on('mouseenter touchstart', function(evt) {
    var $el = $(this);

    if (!$el.hasClass(activeClass)) {
      evt.preventDefault();
    }

    showDropdown($el);
  });

    $('.site-nav--has-dropdown').on('mouseover', function () {
        $('.megamenu').css('top', $('.promo-bar').height() + $('.site-header').height());
    })
  // Mouseout
  $parents.on('mouseleave', function() {
    hideDropdown($(this));
  });

  $subMenuLinks.on('touchstart', function(evt) {
    // Prevent touchstart on body from firing instead of link
    evt.stopImmediatePropagation();
  });

  $allLinks.focus(function() {
    handleFocus($(this));
  });

  $allLinks.blur(function() {
    removeFocus($topLevel);
  });

  // accessibleNav private methods
  function handleFocus ($el) {
    var $subMenu = $el.next('ul'),
        hasSubMenu = $subMenu.hasClass('sub-nav') ? true : false,
        isSubItem = $('.site-nav__dropdown').has($el).length,
        $newFocus = null;

    // Add focus class for top level items, or keep menu shown
    if (!isSubItem) {
      removeFocus($topLevel);
      addFocus($el);
    } else {
      $newFocus = $el.closest('.site-nav--has-dropdown').find('a');
      addFocus($newFocus);
    }
  }

  function showDropdown ($el) {
    $el.addClass(activeClass);

    if ($el.find('.megamenu').length) {
      $('.site-header-top').addClass(activeClass);
    }

    setTimeout(function() {
      timber.cache.$body.on('touchstart', function() {
        hideDropdown($el);
      });
    }, 250);
  }

  function hideDropdown ($el) {
    $el.removeClass(activeClass);
    $('.site-header-top').removeClass(activeClass);

    timber.cache.$body.off('touchstart');
  }

  function addFocus ($el) {
    $el.addClass(focusClass);
  }

  function removeFocus ($el) {
    $el.removeClass(focusClass);
  }
};

timber.mobileNav = function() {
  var classes = {
    mobileNavOpenIcon: 'mobile-nav--open',
    mobileNavCloseIcon: 'mobile-nav--close',
    navLinkWrapper: 'mobile-nav__item',
    navLink: 'mobile-nav__link',
    subNavLink: 'mobile-nav__sublist-link',
    return: 'mobile-nav__return-btn',
    subNavActive: 'is-active',
    subNavClosing: 'is-closing',
    navOpen: 'js-menu--is-open',
    subNavShowing: 'sub-nav--is-open',
    thirdNavShowing: 'third-nav--is-open',
    subNavToggleBtn: 'js-toggle-submenu',
    freezeBody: 'mobile-nav--open-freeze'
  };

  var cache = {};
  var isTransitioning;
  var $activeSubNav;
  var $activeTrigger;
  var menuLevel = 1;
  var mediaQuerySmall = 'screen and (max-width: 1024px)';

  function init() {
    cacheSelectors();

    cache.$mobileNavToggle.on('click', toggleMobileNav);
    cache.$subNavToggleBtn.on('click.subNav', toggleSubNav);

    // Close mobile nav when unmatching mobile breakpoint
    enquire.register(mediaQuerySmall, {
      unmatch: function() {
        if (cache.$mobileNavContainer.hasClass(classes.navOpen)) {
          closeMobileNav();
        }
      }
    });
  }

  function toggleMobileNav() {
    if (cache.$mobileNavToggle.hasClass(classes.mobileNavCloseIcon)) {
      closeMobileNav();
    } else {
      openMobileNav();
    }
  }

  function cacheSelectors() {
    cache = {
      $pageContainer: $('#main-content'),
      $mobileNavToggle: $('.js-mobile-nav-toggle'),
      $mobileNavContainer: $('.mobile-nav-wrapper'),
      $mobileNav: $('#MobileNav'),
      $sectionHeader: $('.header__wrapper'),
      $subNavToggleBtn: $('.' + classes.subNavToggleBtn),
      $mobileNavStories: $('.mobile-nav--stories'),
      $body: $('body')
    };
  }

  function openMobileNav() {

    cache.$mobileNavContainer.prepareTransition().addClass(classes.navOpen);

    cache.$mobileNavContainer.css({
      transform: 'translateX(0px)',
      paddingTop: cache.$sectionHeader.height(),
      marginTop: - cache.$sectionHeader.height()
    });

    cache.$pageContainer.css({
      transform:
        'translate3d(100%, 0, 0)'
    });

    slate.a11y.trapFocus({
      $container: cache.$sectionHeader,
      $elementToFocus: cache.$mobileNavToggle,
      namespace: 'navFocus'
    });

    cache.$mobileNavToggle
      .addClass(classes.mobileNavCloseIcon)
      .removeClass(classes.mobileNavOpenIcon)
      .attr('aria-expanded', true);

    cache.$body.addClass(classes.freezeBody);
    cache.$mobileNavStories.fadeOut();

    // close on escape
    $(window).on('keyup.mobileNav', function(evt) {
      if (evt.which === 27) {
        closeMobileNav();
      }
    });
  }

  function closeMobileNav() {
    cache.$mobileNavContainer.prepareTransition().removeClass(classes.navOpen);

    cache.$mobileNavContainer.css({
      transform: 'translateX(-100%)'
    });

    cache.$pageContainer.removeAttr('style');

    slate.a11y.trapFocus({
      $container: $('html'),
      $elementToFocus: $('body')
    });

    cache.$mobileNavContainer.one(
      'TransitionEnd.navToggle webkitTransitionEnd.navToggle transitionend.navToggle oTransitionEnd.navToggle',
      function() {
        slate.a11y.removeTrapFocus({
          $container: cache.$mobileNav,
          namespace: 'navFocus'
        });
      }
    );

    cache.$body.removeClass(classes.freezeBody);
    cache.$mobileNavStories.fadeIn();

    cache.$mobileNavToggle
      .addClass(classes.mobileNavOpenIcon)
      .removeClass(classes.mobileNavCloseIcon)
      .attr('aria-expanded', false)
      .focus();

    $(window).off('keyup.mobileNav');

    scrollTo(0, 0);
  }

  function toggleSubNav(evt) {
    if (isTransitioning) {
      return;
    }

    var $toggleBtn = $(evt.currentTarget);
    var isReturn = $toggleBtn.hasClass(classes.return);
    isTransitioning = true;

    if (isReturn) {
      // Close all subnavs by removing active class on buttons
      $(
        '.' + classes.subNavToggleBtn + '[data-level="' + (menuLevel - 1) + '"]'
      ).removeClass(classes.subNavActive);

      if ($activeTrigger && $activeTrigger.length) {
        $activeTrigger.removeClass(classes.subNavActive);
      }
    } else {
      $toggleBtn.addClass(classes.subNavActive);
    }

    $activeTrigger = $toggleBtn;

    goToSubnav($toggleBtn.data('target'));
  }

  function goToSubnav(target) {
    /*eslint-disable shopify/jquery-dollar-sign-reference */

    var $targetMenu = target
      ? $('.mobile-nav__dropdown[data-parent="' + target + '"]')
      : cache.$mobileNav;

    menuLevel = $targetMenu.data('level') ? $targetMenu.data('level') : 1;

    if ($activeSubNav && $activeSubNav.length) {
      $activeSubNav.prepareTransition().addClass(classes.subNavClosing);
    }

    $activeSubNav = $targetMenu;

    /*eslint-enable shopify/jquery-dollar-sign-reference */

    var translateMenuHeight = $targetMenu.outerHeight();

    var openNavClass =
      menuLevel > 2 ? classes.thirdNavShowing : classes.subNavShowing;

    cache.$mobileNavContainer
      .removeClass(classes.thirdNavShowing)
      .addClass(openNavClass);
      //.css('height', translateMenuHeight);

    if (!target) {
      // Show top level nav
      cache.$mobileNavContainer
        .removeClass(classes.thirdNavShowing)
        .removeClass(classes.subNavShowing);
    }

    /* if going back to first subnav, focus is on whole header */
    var $container = menuLevel === 1 ? cache.$sectionHeader : $targetMenu;

    var $menuTitle = $targetMenu.find('[data-menu-title=' + menuLevel + ']');
    var $elementToFocus = $menuTitle ? $menuTitle : $targetMenu;

    // Focusing an item in the subnav early forces element into view and breaks the animation.
    cache.$mobileNavContainer.one(
      'TransitionEnd.subnavToggle webkitTransitionEnd.subnavToggle transitionend.subnavToggle oTransitionEnd.subnavToggle',
      function() {
        slate.a11y.trapFocus({
          $container: $container,
          $elementToFocus: $elementToFocus,
          namespace: 'subNavFocus'
        });

        cache.$mobileNavContainer.off('.subnavToggle');
        isTransitioning = false;
      }
    );

    // Match height of subnav
    //cache.$pageContainer.css({
    //  transform: 'translateY(' + translateMenuHeight + 'px)'
    //});

    $activeSubNav.removeClass(classes.subNavClosing);
  }

  return {
    init: init,
    closeMobileNav: closeMobileNav
  };
};

timber.flyoutSearch = function (){
  var classes = {
    flyoutOpen: 'search-active',
    flyoutClosed: 'search-hidden'
  }

  var cache = {};

  function initialize(){
    cacheSelectors();
    cache.$flyoutSearchToggle.on('click', toggleFlyoutSearch);
    cache.$searhLink.on('click', moveToSearchPage);

    $(document).mouseup(function (e) {
      if (cache.$flyoutSearch.length !== 0 && cache.$flyoutSearch.has(e.target).length === 0 &&  $('.flyout-search-trigger').has(e.target).length === 0 && cache.$flyoutSearch.hasClass(classes.flyoutOpen)) {
        closeFlyoutSearch()
      }
    });
  }

  function toggleFlyoutSearch(e){
    e.preventDefault();
    if(cache.$flyoutSearchToggle.hasClass(classes.flyoutOpen)){
      closeFlyoutSearch(e);
    } else {
      openFlyoutSearch(e);
    }
  }


 function moveToSearchPage(e){
    e.preventDefault();
    const searchValue = $('.search-bar.snize-input-style').val();
    if (searchValue.length) {
      window.location.href = '/pages/search-results-page?q=' + searchValue;
    }
  }

  function cacheSelectors(){
    cache = {
      $flyoutSearch: $('.flyout-search'),
      $flyoutSearchToggle: $('.flyout-search-trigger'),
      $flyoutSearchHeader: $('.flyout-header-search'),
      $flyoutSearchInput: $('.search-bar'),
      $searhLink: $('.search-result-url'),
      $body: $('body'),
      freezClass: 'mobile-nav--open-freeze'
    }
  }

  function openFlyoutSearch(e){
    e.preventDefault();

    cache.$flyoutSearchInput.val('');
    cache.$flyoutSearch.addClass(classes.flyoutOpen);
    cache.$flyoutSearch.css({
      transform: 'translateY(0%)'
    });
    cache.$flyoutSearchToggle.addClass(classes.flyoutOpen)
                       .removeClass(classes.flyoutClosed);
    cache.$body.addClass(cache.freezClass);
    $('#promo-dropdown').hide();
    $('.show-promo-dropdown').find('i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
  }

  function closeFlyoutSearch(){
    cache.$flyoutSearch.removeClass(classes.flyoutOpen);
    cache.$flyoutSearch.css({
      transform: 'translateY(-100%)'
    });
    cache.$flyoutSearchToggle.addClass(classes.flyoutClosed)
                       .removeClass(classes.flyoutOpen);
    cache.$body.removeClass(cache.freezClass);
    $('.snize-ac-results').hide();
  }

  return {
    initialize: initialize
  };
}

timber.getHash = function () {
  return window.location.hash;
};

timber.updateHash = function (hash) {
  window.location.hash = '#' + hash;
  $('#' + hash).attr('tabindex', -1).focus();
};
/*
timber.productPage = function (options) {
  var moneyFormat = options.money_format,
      variant = options.variant,
      selector = options.selector,
      addToCartText = options.addToCartText || "Add to Bag";

  // Selectors
  var $productImage = $('#ProductPhotoImg'),
      $addToCart = $('#AddToCart'),
      $productPrice = $('#ProductPrice'),
      $comparePrice = $('#ComparePrice'),
      $addToCartText = $('#AddToCartText'),
      $productNabisco = $('#productMain .product_nabisco'),
      $newNabisco = $('.product_nabisco.new'),
      $finalSaleMarker = $('#finalSaleMarker'),
      $productTags = $('#product-tags').val();
      //$buttonPrice = $('#ButtonPrice'),
      //$quantityElements = $('.quantity-selector, label + .js-qty'),
      //$quantityInput = $quantityElements.find('input'),

  if (variant) {
    $('.inventory_nabisco').hide();
    $('p[id*="collab-"]').hide();
    // Update variant image, if one is set
    if (variant.featured_image) {
      var newImg = $('.productImg[data-image-id="'+ variant.featured_image.id +'"]');
      var newPosition = newImg.closest(".slick-slide").attr('data-slick-index');

      // Slider not loaded
      if (newPosition === undefined) {
        return;
      }else {
         $('#ProductPhoto').slick('slickGoTo',newPosition,true);
      }
    }

    if($('#collab-' + variant.id)){
      $('#collab-' + variant.id).show();
    }

    // Select a valid variant if available
    if (variant.available) {
      if($productTags.indexOf('back in stock ' + variant.title) > -1){
        $('.inventory_nabisco.back_in_stock').show();
        if($newNabisco.length > 0){
          $newNabisco.hide();
        }
      } else if($('#productSelect').find(':selected').attr('data-new') == "no"){
        if($newNabisco.length > 0){
          $newNabisco.hide();
        }
      }
      else {
        if($newNabisco.length > 0){
          $newNabisco.show();
        }
      }
    } else {
      if($productTags.indexOf('soldout ' + variant.title) > -1){
        $('.inventory_nabisco.sold_out').show();
        if($newNabisco.length > 0){
          $newNabisco.hide();
        }
      } else {
        if($newNabisco.length > 0){
          $newNabisco.show();
        }
      }
    }

    // Regardless of stock, update the product price
    /*
    if(membershipProduct) {
      $productPrice.html("<span class='money'>" + Shopify.formatMoney(chargeRabbitFields(variant).amount, moneyFormat).replace(".00", "") + "</span>" + chargeRabbitFields(variant).interval );
      $buttonPrice.html("<span class='money'>" + Shopify.formatMoney(chargeRabbitFields(variant).amount, moneyFormat).replace(".00", "") + "</span>" + chargeRabbitFields(variant).interval );
    }
    else {
      $productPrice.html("<span class='money'>" + Shopify.formatMoney(variant.price, moneyFormat).replace(".00", "") + "</span>");

      var quantity,
      quantityLabel = "";
      if($quantityInput.length)
        quantity = $quantityInput.val();
      else
        quantity = 1;

      if(quantity > 1)
        quantityLabel = "(" + quantity + ")";

      $buttonPrice.attr('data-item-price', variant.price);
      $buttonPrice.attr('data-item-quantity', quantity);
      $buttonPrice.html("<span class='money'>" + Shopify.formatMoney(variant.price * quantity, moneyFormat).replace(".00", "") + "</span>&nbsp;" + quantityLabel);
    }

    $productPrice.html("<span class='money'>" + Shopify.formatMoney(variant.price, moneyFormat).replace(".00", "") + "</span>");
    // Also update and show the product's compare price if necessary
    if (variant.compare_at_price > variant.price) {
      $comparePrice
        .html(Shopify.formatMoney(variant.compare_at_price, moneyFormat).replace(".00", ""))
        .show();
      $finalSaleMarker.val(true);
    } else {
      $comparePrice.hide();
      $finalSaleMarker.val(false);
    }

  } else {
    // The variant doesn't exist, disable submit button.
    // This may be an error or notice that a specific variant is not available.
    // To only show available variants, implement linked product options:
    //   - http://docs.shopify.com/manual/configuration/store-customization/advanced-navigation/linked-product-options
    $addToCart.addClass('disabled').prop('disabled', true);
    $addToCartText.html("Coming Soon");
    //$quantityElements.hide();
  }
};
*/
timber.productPageFilter = function (options) {
  var moneyFormat = options.money_format,
      variant = options.variant,
      selector = options.selector,
      addToCartText = options.addToCartText || "Add to Bag";

  // Selectors
  var $productImage = $('#ProductPhotoImg'),
      $addToCart = $('#AddToCart'),
      $productPrice = $('#ProductPrice'),
      $comparePrice = $('#ComparePrice'),
      $addToCartText = $('#AddToCartText'),
      $productNabisco = $('#productMain .product_nabisco'),
      $newNabisco = $('.product_nabisco.new'),
      $finalSaleMarker = $('#finalSaleMarker'),
      $maskMarker = $('#maskMarker');
      $productTags = $('#product-tags').val();

  if (variant) {

    $('p.text-collab').hide();
    $('p[id*="bis_date-"]').hide();

    if($('#collab-' + variant.id)){
      $('#collab-' + variant.id).show();
    }

    if($('#polarized-' + variant.id)){
      $('#polarized-' + variant.id).show();
    }

    if($('#bis_date-' + variant.id)){
      $('#bis_date-' + variant.id).show();
    }

    if(!$('#fr_nabisco').data('rec')){
      $('.inventory_nabisco').hide();
      // Select a valid variant if available
      if (options.var_a.get(variant.id)) {
        if($productTags.indexOf('back in stock ' + variant.title) > -1){
          $('.inventory_nabisco.back_in_stock').show();
          if($newNabisco.length > 0){
            $newNabisco.hide();
          }
        } else if($('#productSelect').find(':selected').attr('data-new') == "no"){
          if($newNabisco.length > 0){
            $newNabisco.hide();
          }
        }
        else {
          if($newNabisco.length > 0){
            $newNabisco.show();
          }
        }
      } else {
        if($productTags.indexOf('soldout ' + variant.title) > -1){
          $('.inventory_nabisco.sold_out').show();
          if($newNabisco.length > 0){
            $newNabisco.hide();
          }
        } else {
          if($newNabisco.length > 0){
            $newNabisco.show();
          }
        }
      }
  }
    $productPrice.html("<span class='money'>" + Shopify.formatMoney(variant.price, moneyFormat).replace(".00", "") + "</span>");
    // Also update and show the product's compare price if necessary
    if (variant.compare_at_price > variant.price) {
      $comparePrice
        .html(Shopify.formatMoney(variant.compare_at_price, moneyFormat).replace(".00", ""))
        .show();
      $finalSaleMarker.val(true);
    } else {
      $comparePrice.hide();
      $finalSaleMarker.val(false);
    }

    if($maskMarker.val() == "true"){
      $finalSaleMarker.val(true);
    }

  } else {
    // The variant doesn't exist, disable submit button.
    // This may be an error or notice that a specific variant is not available.
    // To only show available variants, implement linked product options:
    //   - http://docs.shopify.com/manual/configuration/store-customization/advanced-navigation/linked-product-options
    $addToCart.addClass('disabled').prop('disabled', true);
    $addToCartText.html("Coming Soon");
    $quantityElements.hide();
  }
};


timber.switchZoom = function (src, imgObject, el) {
  // Make sure element is a jquery object
  var $el = $(el);
  $el.attr('data-zoom-image', src);
};

timber.responsiveVideos = function () {
  $('iframe[src*="youtube.com/embed"]').wrap('<div class="video-wrapper"></div>');
  $('iframe[src*="player.vimeo"]').wrap('<div class="video-wrapper"></div>');
};

timber.collectionViews = function () {
  if (timber.cache.$changeView.length) {
    timber.cache.$changeView.on('click', function() {
      var view = $(this).data('view'),
          url = document.URL,
          hasParams = url.indexOf('?') > -1;

      if (hasParams) {
        window.location = replaceUrlParam(url, 'view', view);
      } else {
        window.location = url + '?view=' + view;
      }
    });
  }
};

timber.loginForms = function() {
  function showRecoverPasswordForm() {
    timber.cache.$recoverPasswordForm.show();
    timber.cache.$customerLoginForm.hide();
  }

  function hideRecoverPasswordForm() {
    timber.cache.$recoverPasswordForm.hide();
    timber.cache.$customerLoginForm.show();
  }

  timber.cache.$recoverPasswordLink.on('click', function(evt) {
    evt.preventDefault();
    showRecoverPasswordForm();
  });

  timber.cache.$hideRecoverPasswordLink.on('click', function(evt) {
    evt.preventDefault();
    hideRecoverPasswordForm();
  });

  // Allow deep linking to recover password form
  if (timber.getHash() == '#recover') {
    showRecoverPasswordForm();
  }
};

timber.resetPasswordSuccess = function() {
  timber.cache.$passwordResetSuccess.show();
};

// Initialize Timber's JS on docready
$(timber.init);

$(document).ready(function() {
  var footerLinklistHeading = $('.site-footer__nav-header');
  var footerLinklistContent = $('.site-footer__nav-links');

  footerLinklistHeading.on('click', function() {
    $(this).toggleClass('open');
    $(this).parent().find(footerLinklistContent).slideToggle(300);
  });


  $(document).keyup(function(e) {
    if (e.keyCode === 27) {

      if ($('.quay-modal__bg').is(':visible')){
        $("#LocationModal, .quay-modal__bg").fadeOut();
        document.activeElement.focus();
      }
      if ($('.flyout-search').hasClass('search-active')) {
        $('.flyout-search').removeClass('search-active');
        $('.flyout-search').css({
          transform: 'translateY(-100%)'
        });
        $('.flyout-search-trigger').addClass('search-hidden').removeClass('search-active');
        $('body').removeClass('mobile-nav--open-freeze');
      }

    }
  });
});

$('.video-controls__pause').on('click', function() {
  var video = $(this).parents('.background-video').find('.background-video__video');
  var thumbnailImage = $(this).parents('.background-video').find('.new-hero__bg-image')
  var iconPlay = $(this).find('.fa-play');
  var iconPause = $(this).find('.fa-pause');

  if (video[0].paused) {
    thumbnailImage.fadeOut();
    video[0].play();
    iconPlay.hide();
    iconPause.show();
  } else {
    video[0].pause();
    iconPlay.show();
    iconPause.hide();
  }
});

$('.video-controls__mute').on('click', function (){
  var video = $(this).parents('.background-video').find('.background-video__video');

  if( video.prop('muted') ) {
    video.prop('muted', false);
    $(this).find('.fa-times').hide();
    $(this).find('.fa-volume-off').removeClass('fa-volume-off').addClass('fa-volume-down');
  } else {
    video.prop('muted', true);
    $(this).find('.fa-times').show();
    $(this).find('.fa-volume-down').removeClass('fa-volume-down').addClass('fa-volume-off');
  }
});

$('.show-promo-dropdown').on('click', function (e) {
    e.preventDefault();
    if ($(this).find('i').hasClass('fa-chevron-up')) {
        $(this).find('i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
        $(this).attr('aria-expanded', false);
    } else {
        $(this).find('i').removeClass('fa-chevron-down').addClass('fa-chevron-up');
        $(this).attr('aria-expanded', true);
    }

    $('#' + $(this).attr('aria-controls')).slideToggle();

});

	$('.featured-products__tab-title').on('click', function () {
		var tabId = $(this).attr('id'),
      windowWidth = $(window).width(),
      slideIndex = $(this).attr('data-slick-index');

		if (windowWidth > 767) {
			$('.featured-products__tab-title').removeClass('featured-products__tab-title--active');
			$(this).addClass('featured-products__tab-title--active');
			$('.featured-products__item').hide();
			$('a[data-tab-item="' + tabId + '"]').fadeIn('slow');
    } else {
			$('a[data-slick-index="' + slideIndex + '"]').fadeIn('slow');
    }
	});

	function featuresTabInitSlider() {
	  if ((($(window).width()) < 768)) {
			$('.featured-products__tab-wrapper').slick({
				slidesToShow:3,
				slidesToScroll:1,
				infinite:true,
				focusOnSelect:true,
				centerMode: true,
				autoplay:false,
				arrows:false,
				speed: 700,
				dots: false,
				mobileFirst:true,
				asNavFor: '.featured-products__items'
			});

			$('.featured-products__items').slick({
				slidesToShow:1,
				slidesToScroll:1,
				infinite:true,
				focusOnSelect:false,
				centerMode: false,
				autoplay:false,
				speed: 400,
				arrows:false,
				dots: false,
				asNavFor: '.featured-products__tab-wrapper',
				mobileFirst:true,
        responsive:[
          {
            breakpoint:767,
            settings:'unslick'
          }
        ]
			});
    }
  }
	featuresTabInitSlider ();


	//Recommended products slider
	$('.recommended-products-slider').slick({
		slidesToShow:1,
		slidesToScroll:1,
		infinite:false,
		focusOnSelect:false,
		centerMode: false,
		autoplay:false,
		arrows:false,
		dots: true,
		mobileFirst:true,
		responsive: [
			{
				breakpoint: 767,
				settings: {
					slidesToShow: 2
				}
			},
			{
				breakpoint: 1023,
				settings: {
					arrows:true,
					slidesToShow: 4,
					centerMode: false
				}
			}
		]
	});
