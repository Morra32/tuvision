if (window.jQuery === undefined) {
  var s = document.createElement('script');
  s.src = "//ajax.googleapis.com/ajax/libs/jquery/3.2.1/jquery.js";
  document.head.appendChild(s);
}

var _learnq = _learnq || [];

/*
* ============================================================
*                     MODAL FUNCTIONS
* ============================================================
*/

$(function () {

  // opens the Ditto modal when a modal CTA element is clicked
  // targets anything with the ditto-try-on-cta class
  $(document).on('touchstart click', '.ditto-try-on-cta, a[href="#ditto-try-on"]', function(e) {
      e.preventDefault();
      ditto_vto.openTryOnModal();
      ditto_vto.closeMobileMenu();
  });

  // closes a modal when closing elements are clicked
  $(document).on('touchstart click', function(e) {
      if ($(e.target).hasClass('modal-close')) {
          var $modal = $(e.target).hasClass('.modal') ? $(e.target) : $(e.target).closest('.modal');
          ditto_vto.closeTryOnModal();
      }
  });

  // opens a modal
  // freezes and blurs the rest of the page
  // if there is no modal, this will disable buttons that link to it
  ditto_vto.openTryOnModal = function() {

    var $modalsContainer = $('#modals');
    $('body').append($modalsContainer);
    $('#ditto-try-on-modal').addClass('modal--open');
    $('body').addClass('body--freeze');

    var contentSelector;
    if(ditto.api.isSupported())
      contentSelector = '#ditto-creation';
    else
      contentSelector = '#ditto-error';

    if(contentSelector) {
      $(contentSelector).siblings().hide();
      $(contentSelector).show();
    }

    ditto_vto.createTryOnView('#ditto-creation');
  }

  // closes a modal
  // unfreezes and unblurs the rest of the page
  // $target represents a $('.modal')
  ditto_vto.closeTryOnModal = function() {
    $('body').removeClass('body--freeze');
    $('#ditto-try-on-modal').removeClass('modal--open');
  }

  // closes mobile menu flyout
  ditto_vto.closeMobileMenu = function() {
    $('body').addClass('body--closed-menu');
  }

});

/*
* ============================================================
*                     TRY ON FUNCTIONS
* ============================================================
*/

// Restarts the entire try on view process
ditto_vto.retakeTryOn = function() {

  var $modalsContainer = $('#modals');
  $('body').append($modalsContainer);
  $('#ditto-try-on-modal').addClass('modal--open');
  $('body').addClass('body--freeze');

  var contentSelector;
  if(ditto.api.isSupported())
    contentSelector = '#ditto-creation';
  else
    contentSelector = '#ditto-error';

  if(contentSelector) {
    $(contentSelector).siblings().hide();
    $(contentSelector).show();
  }

  ditto_vto.createTryOnView('#ditto-creation');
}

// Deletes the entire try on views associated with current ditto id
ditto_vto.deleteTryOn = function() {
  ditto_vto.eraseCookie('ditto_id');
  ditto_vto.eraseCookie('ditto_created');
  ditto_vto.eraseCookie('ditto_products');
  ditto_vto.eraseCookie('ditto_selfie_view');
  ditto_vto.eraseCookie('ditto_faceshape');
  localStorage.removeItem('ditto_faceshape');
  localStorage.removeItem('ditto_width');
  localStorage.removeItem('ditto_pd');
  localStorage.removeItem('ditto_products');
  localStorage.removeItem('ditto_vto_recs');
  localStorage.removeItem('ditto_all');
  localStorage.removeItem('ditto_optical');
  ditto_vto.dittoId = null;
  location.reload();
}

/**
* Create a try on view and display after creation
*
* @returns {void}
* @param {string} selector - Selector in which try on view will appear
* @param {string} sku - Product sku to display on top of the current used face
*/
ditto_vto.createTryOnView = function(selector, sku){

  $.get('/tools/token/?message='+ditto_vto.quayurl, function(response){

      var dittoCreation = new ditto.api.DittoCreation({
        selector: selector,
        accessKeyId: response['X-Ditto-Access-Key-Id'],
        clientSignature: response['X-Ditto-Signature'],
        serverNetloc: "https://vto."+ditto_vto.dittourl+".api.ditto.com",
        faServerNetloc: "https://face."+ditto_vto.dittourl+".api.ditto.com",
        font:"montserrat",
        partnerId: ditto_vto.quayurl,
        enableClose: true,
        forceScale: true,
        enableFaceAnalysis: true,
        disableScale: false
      }, {
        success: function(callbackObject) {
          console.log('success', callbackObject);
          console.log('Created ditto: ' + callbackObject.dittoId);
          ditto_vto.dittoId = callbackObject.dittoId;
          ditto_vto.setCookie('ditto_id', callbackObject.dittoId, 30);
          ditto_vto.setCookie('ditto_selfie_view', 'true', 30);
          if(!callbackObject.realScale){
            ditto_vto.setDefaultPD(ditto_vto.dittoId, 61);
          } else {
            ditto_vto.createTryOnSuccess();
          }
        },
        failure: function(callbackObject) {
          console.log('failure', callbackObject);
        },
        progress: function(callbackObject) {
          console.log('progress', callbackObject);
        },
        close: function(callbackObject) {
          console.log('close', callbackObject);
          ditto_vto.closeTryOnModal();
        },
        faceiq_result: function(callbackObject){
          var obj = callbackObject.faceShape;
          if(obj){
            // check added as face width is also now returned
            ditto_vto.setCookie('ditto_faceshape', Object.keys(obj).reduce(function(a, b){ return obj[a] > obj[b] ? a : b }));
          }
        }
    });
  });
}

/**
* Update PD for a Ditto ID if realScale fails
*
* @param {string} ditto_id - dittoId to add default PD to
  @param {float} pd - default PD to use
***/
ditto_vto.setDefaultPD = function(ditto_id, pd){
  $.get('/tools/token/?message=' + ditto_vto.dittoId, function(response){
    targetUrl = 'https://vto.' + ditto_vto.dittourl +'.api.ditto.com/api/1.3/dittos/'+ditto_vto.dittoId+'/?pd='+pd;
    $.ajax({
      type: 'PUT',
      url: targetUrl,
      headers: {
        'X-Ditto-Access-Key-Id': response['X-Ditto-Access-Key-Id'],
        'X-Ditto-Signature': response['X-Ditto-Signature']
      },
      success: function(result, status, xhr) {
          console.log('success');
          ditto_vto.createTryOnSuccess();
      },
      failure: function() {
          console.log('failure');
      },
      error: function(xhr, status, e) {
          console.log('error '+status+' '+e);
      }
    });
  });
}

ditto_vto.createTryOnSuccess = function(){
  ditto_vto.getProducts();
  ditto_vto.postFaceIQ();
  ga('send', 'event', 'VTO', 'create', 'Create a Ditto');
  _learnq.push(['track','Create a VTO']);
  if (ditto_vto.template.indexOf('product') > -1 || ditto_vto.template.indexOf('collection') > -1 ){
    setTimeout(function(){
      window.location.reload();
    }, 1000);
  } else if (ditto_vto.template.indexOf('vto') > -1) {
    ditto_vto.closeTryOnModal();
    $('.fyq-vto-intro, .fyq-header > *:not(h1)').hide();
    $('.fyq-header > h1').text('JUST FOR YOU');
    $('.fyq-vto').show();
    $('#ditto-offer').show();
    $('.vto-delete').show();
    setTimeout(function(){
      ditto_vto.displayTryOnView('#vto-selfie', '19466', 'HIGH KEY - BLK/SMK', 'VTO Page');
    }, 3000);
    if(ditto_vto.getCookie("ditto_faceshape") != null){
      $('.vto-faceshape').show();
      if(ditto_vto.getCookie("ditto_faceshape") == "OVAL"){
          _learnq.push(['track','Face Shape via VTO',{ 'Face Shape': 'OVAL'}]);
          $('#vto-faceshape').html("N <strong>OVAL</strong>");
          $('#vto-faceshape-copy').text("Choosing styles with geometric lines like squares, cat eyes, and rectangular shields + aviators will help balance your face + create angles.");
          $('#vto_page_cta').attr('href','/collections/oval-faces');
      } else if (ditto_vto.getCookie("ditto_faceshape") == "HEART"){
          _learnq.push(['track','Face Shape via VTO',{ 'Face Shape': 'HEART'}]);
          $('#vto-faceshape').html(" <strong>HEART</strong>");
          $('#vto-faceshape-copy').text("Choosing styles with rounded edges will help soften your face shape, while square frames will help flatter your chiseled features.");
          $('#vto_page_cta').attr('href','/collections/heart-faces');
      } else if (ditto_vto.getCookie("ditto_faceshape") == "ROUND") {
          _learnq.push(['track','Face Shape via VTO',{ 'Face Shape': 'ROUND'}]);
          $('#vto-faceshape').html(" <strong>ROUND</strong>");
          $('#vto-faceshape-copy').text("Choosing styles with geometric lines like squares, cat eyes, and rectangular shields + aviators will help balance your face + create angles.");
          $('#vto_page_cta').attr('href','/collections/round-faces');
      } else {
          _learnq.push(['track','Face Shape via VTO',{ 'Face Shape': 'SQUARE'}]);
          $('#vto-faceshape').html(" <strong>SQUARE</strong>");
          $('#vto-faceshape-copy').text("Choosing tapered frames + styles with rounded edges will help balance your face and flatter your angular jawline.");
          $('#vto_page_cta').attr('href','/collections/square-faces');
      }
    }
  } else {
    if(ditto_vto.getCookie("ditto_faceshape") != null){
      if(ditto_vto.getCookie("ditto_faceshape") == "OVAL"){
        window.location.href = "/collections/oval-faces";
      } else if (ditto_vto.getCookie("ditto_faceshape") == "HEART"){
        window.location.href = "/collections/heart-faces";
      } else if (ditto_vto.getCookie("ditto_faceshape") == "ROUND") {
        window.location.href = "/collections/round-faces";
      } else {
        window.location.href = "/collections/square-faces";
      }
    } else {
      window.location.href = "/collections/bestsellers";
    }
  }
}

/**
* Create a quick frontal VTO
*
* @returns {void}
* @param {string} selector - Selector in which try on view will appear
* @param {string} sku - Product sku to display on top of the current used face
*/
ditto_vto.displayTryOnFrontal = function(selector, sku){
  $.get('/tools/token/?message=' + ditto_vto.dittoId, function(response){

    var options = {
      dittoId: ditto_vto.dittoId,
      sku: sku,
      size:"640,480",
      accessKeyId: response['X-Ditto-Access-Key-Id'],
      signature: response['X-Ditto-Signature'],
      partnerId: ditto_vto.quayurl,
      serverNetloc: "https://vto."+ditto_vto.dittourl+".api.ditto.com"
    };

    ditto.api.getFrontalFrame(options,
      data => {
        //debugger;
        $(selector).attr('src', URL.createObjectURL(data));
      },
      error => {
        console.log('Failure')
      }
    );

  }); // get
} // displayTryOnFrontal

/**
* Displays a pair of glasses in a container
*
* @returns {void}
* @param {string} tryOnSelector - Selector in which try on view will appear
* @param {string} sku - Product sku to display on top of the current used face
*/
ditto_vto.displayTryOnView = function(tryOnSelector, sku, title, src, thumbnail){
  if(ditto_vto.dittoProducts.indexOf(sku) > -1){
    $('#selfie_view_unavailable').hide();
    $('#selfie_view').css('background-color', '#FFFFFF');
    $.get('/tools/token/?message=' + ditto_vto.dittoId, function(response){

      var options = {
        selector: tryOnSelector,
        dittoId: ditto_vto.dittoId,
        sku: sku,
        accessKeyId: response['X-Ditto-Access-Key-Id'],
        signature: response['X-Ditto-Signature'],
        partnerId: ditto_vto.quayurl,
        serverNetloc: "https://vto."+ditto_vto.dittourl+".api.ditto.com"
      };

      if(thumbnail)
        options.thumbnailSelector = thumbnail;

      var tryOn = new ditto.api.TryOn(options,{
        initialized: function () {
          console.log('initialized');
        },
        success: function () {
          console.log('Success');
          try{
            ga('send', 'event', 'VTO', 'display', 'Display VTO on PDP');
            _learnq.push(['track','Displayed VTO',{
              'PageType': src,
              'Product': title,
              'SKU':sku
            }]);
          } catch(e){
            console.log("VTO logging error");
          }
          $('#ditto-to').show().siblings().hide();
          if (ditto_vto.template.indexOf('vto') > -1){
          	$('#vto-selfie-placeholder').hide();
          }
        },
        failure: function() {
          console.log('Failure')
        } ,
        onclick : function() {
          console.log('Optional Event: Click of VTO')
        }
      });

    });
  } else {
    $('#selfie_view_unavailable').show();
    $('#selfie_view').css('background-color', '#FFFFFFBB');
    $('#selfie_view iframe').hide();
  }
}

/*
* ============================================================
*                     PAGE LOAD FUNCTIONS
* ============================================================
*/

$(function() {
  $(document).on('touchstart click', '.ditto_edit', function (e) {
    e.preventDefault();
    $(this).toggleClass('active');
  });

  // Retake Ditto picture
  $(document).on('touchstart click', '.ditto_retake', function (e) {
    e.preventDefault();
    ditto_vto.retakeTryOn();
  });

  // Delete Ditto picture
  $(document).on('touchstart click', '.ditto_delete', function (e) {
    e.preventDefault();
    ditto_vto.deleteTryOn();
  });

  // Remove try it on profile on logout
  $(document).on('touchstart click', '[href="/account/logout"]', function(e){
    e.preventDefault();
    ditto_vto.eraseCookie('ditto_id');
    ditto_vto.eraseCookie('ditto_created');
    ditto_vto.dittoId = null;
    window.location.href = $(this).attr('href');
  });
});

ditto_vto.getProducts = function(){
  $.get('/tools/token/?message='+ditto_vto.quayurl, function(response){

    var options = {
      accessKeyId: response['X-Ditto-Access-Key-Id'],
      clientSignature: response['X-Ditto-Signature'],
      partnerId: ditto_vto.quayurl,
      serverNetloc: "https://vto."+ditto_vto.dittourl+".api.ditto.com"
    };

    ditto.api.getProducts(options,
      data => {
        //debugger;
        console.log(data);
        ditto_vto.setProducts(data.ids);
      },
      error => {
        console.log('Failure')
      }
    );
  }); // get
}

ditto_vto.setProducts = function(products){
  var ditto_products_string = JSON.stringify(products);
	ditto_vto.dittoProducts = ditto_products_string;
	//ditto_vto.setCookie("ditto_products", ditto_products_string);
  localStorage.setItem('ditto_products',ditto_products_string);
  ditto_vto.setCookie('ditto_products_set', true, 3);
}

if(!ditto_vto.getCookie('ditto_products_set') && ditto_vto.dittoId){
  ditto_vto.getProducts();
}

/*
* ============================================================
*                     PRODUCT SELFIE FUNCTIONS
* ============================================================
*/
if (ditto_vto.template.indexOf('product') > -1 && ditto_vto.dittoId) {

  $(function () {

    var currentSKU = ditto_vto.getSelectedOrFirstAvailableVariant(product).sku;
    var currentTitle = ditto_vto.getSelectedOrFirstAvailableVariant(product).name;
    currentSKU = currentSKU.replace(/\D+/g,'');
    /* Based on which button is clicked on the product page, it will display the TryOn container */
    $(document).on('touchstart click', '[data-view]', function (e) {
      e.preventDefault();
      $('[data-view]').removeClass('active');
      $(this).addClass('active');
      var view = $(this).data('view');

      $('[data-ditto-view="' + view + '"]').css('visibility', 'visible').addClass("ditto-view-visible");
      $('[data-ditto-view]').not('[data-ditto-view="' + view + '"]').css('visibility', 'hidden').removeClass("ditto-view-visible");

      if(view === "selfie_view"){
      	ditto_vto.setCookie('ditto_selfie_view', 'true', 90);
      } else {
      	ditto_vto.setCookie('ditto_selfie_view', 'false', 90);
      }
    });

    if($('.ditto-toggle-view').length){
      $('.ditto-toggle-view').addClass('active');
    }

    $('#ditto-pdp-explore').hide();

    if(ditto_vto.dittoProducts){
      //Activates Ditto on load
      ditto_vto.displayTryOnView('#selfie_view', currentSKU, currentTitle, 'Product Page');
    }

    if(ditto_vto.selfieView){
      if(ditto_vto.selfieView === "true"){
      	$("button[data-view='selfie_view']").click();
      }
    }
  });
}


ditto_vto.getSelectedOrFirstAvailableVariant = function(product){
  if (ditto_vto.currentVariant) {
    return ditto_vto.currentVariant;
  }

  for (var i = 0; i < product.variants.length; i++) {
    var variant = product.variants[i];
    if (variant.inventory_quantity > 0) {
      return variant;
    }
  }
}


/*
* ============================================================
*                     COLLECTION SELFIE FUNCTIONS
* ============================================================
*/
if (ditto_vto.template.indexOf('collection') > -1 && ditto_vto.dittoId && ditto_vto.dittoProducts) {
  var recs = JSON.parse(localStorage.getItem("ditto_vto_recs"));
  $(function () {
    $('.product-grid-item').each(function(){
      var handle = $(this).data('handle');
      if(!(recs == null) && recs.indexOf(handle) > -1){
        $(this).find('.product_nabisco').removeClass('bis_nabisco sold_out_nabisco new_nabisco').addClass('fr_nabisco');
      }
    });

    $(document).on('touchstart click', '[data-view]', function (e) {
      e.preventDefault();
      $('[data-view]').removeClass('active');
      $(this).addClass('active');
      var view = $(this).data('view');

      if(view === 'selfie_view'){
        try{
          ga('send', 'event', 'VTO', 'display', 'Display VTO on Collection Page');
          _learnq.push(['track','Displayed VTO',{
            'PageType':'Collection Page',
            'SKU':''
          }]);
        } catch(e){
          console.log("VTO logging error");
        }
      	$('.ditto_thumbnail_preview_wrapper').addClass('active');
        if(!$(this).hasClass('activated')){
          console.log("activating");
          $('.product-grid-item').each(function(){
          	var sku = $(this).data('sku');
            sku = sku.toString().replace(/\D+/g,'');
            var selector = $(this).find('.ditto_thumbnail_preview') || undefined;
            if(ditto_vto.dittoProducts.indexOf('"' + sku + '"') > -1){
              ditto_vto.displayTryOnFrontal(selector, sku);
              $(this).find('.ditto_thumbnail_preview_wrapper').css('background-color', '#ffffff');
            } else {
              selector.hide();
            }
          });
          $(this).addClass('activated');
        }
        ditto_vto.setCookie('ditto_selfie_view', 'true', 90);
      } else {
        $('.ditto_thumbnail_preview_wrapper').removeClass('active');
        ditto_vto.setCookie('ditto_selfie_view', 'false', 90);
      }
    });

    $('#ditto-collection-explore').hide();

    if($('.ditto-toggle-view').length){
      $('.ditto-toggle-view').addClass('active');
    }

    if(ditto_vto.selfieView){
      if(ditto_vto.selfieView === "true"){
      	$("button[data-view='selfie_view']").click();
      }
    }
  });
}

/*
* ============================================================
*                     FACE IQ
* ============================================================
*/

ditto_vto.postFaceIQ = function(){
  $.get('/tools/token/?message=' + ditto_vto.dittoId, function(response){
    var targetUrl = 'https://face.' + ditto_vto.dittourl +'.api.ditto.com/faceiq/api/1.0/analyses/'+ditto_vto.dittoId;
    var fi_data = ["face-shape", "facial-landmarks", "face-width", "pupillary-distance"];
    var settings = {
      "async": true,
      "crossDomain": true,
      "url": targetUrl,
      "method": "POST",
      "headers": {
        "content-type": "application/json",
        'X-Ditto-Access-Key-Id': response['X-Ditto-Access-Key-Id'],
        'X-Ditto-Signature': response['X-Ditto-Signature'],
      },
      "processData": false,
      "data": JSON.stringify(fi_data)
    }

    $.ajax(settings).done(function (response) {
      ditto_vto.getFaceIQ();
    }).fail(function(){
      console.log('face iq failure');
    });

  });
}

ditto_vto.getFaceIQ = function(){
  $.get('/tools/token/?message=' + ditto_vto.dittoId, function(response){
    targetUrl = 'https://face.' + ditto_vto.dittourl +'.api.ditto.com/faceiq/api/1.0/analyses/'+ditto_vto.dittoId+'/results/';
    $.ajax({
      type: 'GET',
      url: targetUrl,
      headers: {
        'X-Ditto-Access-Key-Id': response['X-Ditto-Access-Key-Id'],
        'X-Ditto-Signature': response['X-Ditto-Signature']
      },
      success: function(result, status, xhr) {
          console.log('success face shape');
          let shapeResult = result["face-shape"];
          let faceArray = [];
          for (const shape in shapeResult) {
            if(shapeResult[shape] > 0) {
              faceArray.push({ "shape" : shape.toLowerCase(), "distribution" : shapeResult[shape] });
            }
          }
          localStorage.setItem('ditto_faceshape',JSON.stringify(faceArray));
          localStorage.setItem('ditto_width',result["face-width"].value);
          localStorage.setItem('ditto_pd',result["pupillary-distance"].value);
          console.log('face iq success');
      },
      failure: function() {
          console.log('failure');
      },
      error: function(xhr, status, e) {
          console.log('error '+status+' '+e);
      }
    });
  });
}
