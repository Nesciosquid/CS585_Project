# Project: Browser-based 3D Pose Estimation

For CS585 at Boston University, Fall 2015.

Teammates: Aaron Heuckroth and Elena Quijano

[Background information for our project is available here.](http://www.heuckroth.com/CS585_Project/proposal/)

## Goals

* Implement 3D pose estimation using standardized augmented reality markers in a web browser. 
* Allow for visualization of 'holographic' models in physical space, projected into a live video stream.
* Respond intuitively to changes in marker or camera location and orientation and loss of tracking.
* Allow users to specify any 3D model (.stl file) to be rendered.
* Take images that look like this... ![We wanted to turn images like this...](https://raw.githubusercontent.com/Nesciosquid/CS585_Project/master/sample_photos/IMG_4115.JPG)

* ... and turn them into images that look like this! ![... into images like this!](https://raw.githubusercontent.com/Nesciosquid/CS585_Project/master/sample_photos/composite_4115.JPG)

## Try it out

Since our solution is implemented in Javascript and HTML5, it can be run easily from most modern web browsers. We recommend Chrome on Windows and either Chrome or Safari on OSX.

[You can access the demo here.](https://nesciosquidsecure.github.io/CS585_Project/demo/)

You will need access to an augmented reality marker to display in front of the webcam to localize the "hologram." 

[Here is a pattern we created](https://raw.githubusercontent.com/Nesciosquid/CS585_Project/master/demo/markers/MultiMarkerDuo.png) which uses multiple markers to improve tracking quality, which can be either printed or displayed on an electronic screen. Be aware that glare from shiny cell phone screens can impede tracking performance. This pattern has been optimized to provide true-to-life-size rendering when actual printed or displayed width of the largest square is 44mm across.

You can view any standard STL file. We recommend checking out [Thingiverse](https://www.thingiverse.com/) to find interesting, 3D-printable models to display. Simply download one that looks interesting, then drag and drop it into the viewing window to load it up.

The sliders on the left side of the screen provide options for tweaking the way the 'hologram' is displayed. If you can't see these, you're probably viewing the demo from a small window. In that case, there's a small button (three horizontal black lines) which will open up the controls when clicked.

## Results

[Here is a demonstration video showing our solution in action.](https://www.youtube.com/watch?v=CxM675WPhRY&feature=youtu.be)

## Methodology

* Webcam feed is obtained from the browser, and individual frames are passed along to the renderer and marker detector for processing.
* Markers are detected using [js-aruco](https://github.com/jcmellado/js-aruco), which first finds black squares in the image by searching for corners, then uses [POSIT](http://www.aforgenet.com/articles/posit/) to compute the 3D position and orientation of those markers relative to the camera. This is done on a downsampled, low-resolution version of the incoming webcam footage, to reduce processing time and memory usage.
* If multiple markers are detected, we average their positions and rotations to improve our pose estimate.
* The velocity for each of the 6 parameters (x,y,z location and rotation) is computed relative to the previous frame.
* The 12 values (x,y,z location, rotation, and computed velocities) are passed through a Kalman Filter to remove jitter.
* The filter returns an estimate of the current position and rotation of the average marker position.
* The holographic model's position and rotation are updated based on the estimated position.
* The model is then rendered overtop of the original (high-resolution) webcam footage and displayed to the user.

## Challenges

   Estimating pose from webcam video can be tricky, since the image is relatively noisy, and this causes minor fluctuations in pixel coloration that lead to small (but noticeable) differences in position and rotation state estimation from frame to frame. We overcame this by using a Kalman filter to remove jitter and smooth out the estimated poses. This filter was fairly tricky to implement, since it required averaging Euler rotation values, which can cause serious problems when done naively. (The average of -1 degrees and 361 degrees should not be 180 degrees, for example.) While we could have solved this by converting our Euler rotational values to quaternions, we instead wrote an iterative averaging function which adjusts rotation values to ensure that they fall within an acceptable range of one another before averaging them together, then used that function both for averaging marker rotations and for processing inputs to our Kalman filter.
   
   Using only one marker led to instability at certain angles (due to glare and viewing angle). While the original AR library allowed for the detection of multiple markers, it assumed that all markers were the same size, and only one marker would be used for positioning. We expanded this to allow the specification of sizes and offset positions of multiple markers, using all markers detected in any frame to compute an average estimated position and rotation.
   
   While overlaying a transparent 3D model over a flat image was fairly straightforward, tweaking the rendering to make the object appear to be a 'hologram' hovering in 3D space was tricky. We achieved this effect by cycling the opacity of the object over time, as well as using masks and filters to produce the scanline and 'ripple' effects that give the impression that the model is a sci-fi themed hologram.
   
   [We discovered and reported](https://github.com/jcmellado/js-aruco/issues/12) a dangerous, crash-inducing memory leak in Chrome which causes massive increases (100 MB/sec) in memory usage when processing large HD (1280x720) webcam images. We tried multiple approaches to solving this problem (such as using explicit JPEG decoding libraries to speed up processing time and avoid slow 2D graphics), but ultimately found success in downsampling the webcam video to a much smaller resolution before passing it into our AR marker detection. This also had the side-effect of doubling our framerates.
   
   [We also diagnosed and reported issues associated with using masking filters with Three.js](https://github.com/mrdoob/three.js/issues/3870#issuecomment-161846817), and ultimately suggested solutions for improving documentation on how to set up the renderers properly.
   
## Discussion

We succeeded in implementing pose estimation and creating a tool which will render arbitrary 3D objects as 'holograms' using augmented reality markers. This solution is fairly robust, runs in a web browser, and performs well even on computers without powerful graphics processors. It also works on Android devices which allow for camera access.

We would like to improve the performance of this application when the viewing area is resized, and to have it respond more intelligently to unexpected webcam resolutions. (It currently positions the model correctly, but the aspect ratio of the displayed video stream can be screwed up.)

We did not improve on the state-of-the-art for 3D pose estimation, but that wasn't our goal! We intended, instead, to implement this technique in an accessible, functional, and aesthetically pleasing way. Along the way, we discovered and reported several issues with the tools we used, which will make future efforts to create applications like this easier.

We have also shown that Javascript and HTML5 are valuable tools for creating computer vision applications, especially when the goal is to make them more accessible to many users on a variety of computing platforms.

## Tools Used

* [js-aruco](https://github.com/jcmellado/js-aruco): Augmented reality library which provided both marker detection and basic 3D pose estimation functions
* [kalman.js](https://github.com/itamarwe/kalman): Kalman Filter library, used to smooth out position and rotation data between samples
* [sylvester.js](http://sylvester.jcoglan.com/): Matrix math library, required to support kalman.js 
* [three.js](https://github.com/mrdoob/three.js/): 3D graphics library, which provides support rendering 3D objects using WebGL
* [STL Viewer](https://gist.github.com/bellbind/477817982584ac8473ef/): Used for loading arbitrary STL files.
* [BadTV Shader](https://www.airtightinteractive.com/demos/js/badtvshader/): Used to provide hologram-like distortion effects to the rendered image.
* [webcam.js](https://github.com/jhuckaby/webcamjs): Provides cross-browser support for loading webcam images as standard HTML5 video.
* [Google Material Design Lite](http://www.getmdl.io/): Web framework for look and feel.
   

