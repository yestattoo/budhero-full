
Parse.initialize("MUqbNflspPmmtdBLtHFgO8dkQWVdMZzSGWxmN4NS", "2s1HRDxuzn3M6i7ESleYrJKjjyMexDDIbeXYbdvD");
//variables
var zip;
var geo;
var address;

//functions
// function getLocation(){
//     console.log("ZIP SEARCHING");
//     $.ajax({
//        url : "https://maps.googleapis.com/maps/api/geocode/json?address="+$("#zip-input").val(),
//        method: "POST",
//        success:function(data){
//           if (data.status == "OK"){
//             latitude = data.results[0].geometry.location.lat;
//             longitude = data.results[0].geometry.location.lng;
            
//             geo = new Parse.GeoPoint({latitude: latitude, longitude: longitude});
//             address = data.results[0].formatted_address;

//           } else if (data.status == "ZERO_RESULTS") {
//             console.log('no results found');
//             $("#main-message").html("Zipcode not found");
//             $("#email. #submit-form").fadeOut(500);
//           } else {
//             console.log("some other error");
//           }
//           console.log(data.status);
//        }
//     });
// }
// var startGetLocation = _.debounce(getLocation, 1200);

// http://stackoverflow.com/questions/8150132/how-to-extract-postal-code-from-v3-google-maps-api
// function extractFromAdress(components, type){
//     for (var i=0; i<components.length; i++)
//         for (var j=0; j<components[i].types.length; j++)
//             if (components[i].types[j]==type) return components[i].long_name;
//     return "";
// }


$(window).load(function(){
  //start
  $('#welcome-message').fadeIn(1100);

  //zip inputs
  $("#zip-input").keyup(function(e){
      if ($(this).val().length >= 5 || e.which === 13 ) {
          startGetLocation();
      }
  });

  // Highlight the top nav as scrolling occurs
  $('body').scrollspy({
      target: '.nav'
  });

  // jQuery for page scrolling feature - requires jQuery Easing plugin
  $('a.page-scroll').bind('click', function(event) {
      var $anchor = $(this);
      $('html, body').stop().animate({
          scrollTop: $($anchor.attr('href')).offset().top
      }, 1500, 'easeInOutExpo');
      event.preventDefault();
  });

  $('#main-nav').affix({
    offset: {
      top: 420,
      bottom: function () {
        return (this.bottom = $('.footer').outerHeight(true))
      }
    }
  });
});

//signup
// $("#link-form").on("submit", function(e){
//   console.log('form submitted');
//   e.preventDefault();
//   $('#link-form, #submit-button').attr("disabled", true);

//   var PreUser = Parse.Object.extend("preUser");
//   var preUser = new PreUser();
//     preUser.save({email: $('#email-input').val(), zip: $('#zip-input').val(), location: geo, address: address}, {
//     success: function(object) {
//       $('#submit-button').html("Invitation Sent!");
//       // $('#link-form, #submit-button').attr("disabled", false);
//     },
//     error: function(model, error) {
//       $("#main-message").html("Something went wrong, please try again");
//       $('#link-form, #submit-button').attr("disabled", false);
//     }
//   });
// });

//get link
$("#send-link-button").on("click", function(e){
  console.log('sending link');
  e.preventDefault();
  $('#phone-input, #send-link-button').attr("disabled", true);
  Parse.Cloud.run("sendLink", {phone:$("#phone-input").val()}, {
      success: function (results) {
        console.log(results);
        $('#phone-input, #send-link-button').attr("disabled", false);
        $(".alert").fadeOut();
        $(".modal").modal('hide');
      },
      error: function (error) {
        console.log(error);
        $(".alert").fadeIn().html(error);
        $('#phone-input, #send-link-button').attr("disabled", false);
      }
  });
});


