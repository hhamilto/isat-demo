var socket = io('')
//heavy inspiration/copying from some from: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos

takepicture = (function() {
 
  var width = 320   // We will scale the photo width to this
  var height = 0    // This will be computed based on the input stream

  var streaming = false
  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.
  var video = null
  var canvas = null
  var photo = null
  var startbutton = null

  function startup() {
    video = document.getElementById('video')
    canvas = document.getElementById('canvas')

    navigator.getMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia)

    navigator.getMedia(
      {
        video: true
      },
      function(stream) {

        var gimmeaccess = document.getElementById('ineedaccess');
        gimmeaccess.setAttribute('class','hidden');
        if (navigator.mozGetUserMedia) {
          video.mozSrcObject = stream
        } else {
          var vendorURL = window.URL || window.webkitURL
          video.src = vendorURL.createObjectURL(stream)
        }
        video.play();
      },
      function(err) {
        console.log("An error occured! " + err)
      }
    )

    video.addEventListener('canplay', function(ev){
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width)
      
        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.
      
        if (isNaN(height)) {
          height = width / (4/3)
        }
      
        video.setAttribute('width', width)
        video.setAttribute('height', height)
        canvas.setAttribute('width', width)
        canvas.setAttribute('height', height)
        streaming = true;
      }
    }, false)
  }

  
  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.

  function takepicture() {
    var context = canvas.getContext('2d')
    canvas.width = width
    canvas.height = height
    context.drawImage(video, 0, 0, width, height)
    var data = canvas.toDataURL('image/png')
    socket.emit('photo', data)
  }
  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false)
  return takepicture
})();
