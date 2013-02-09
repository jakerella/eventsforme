<?php

// FOR TESTING
if (preg_match("/^test\./", $_SERVER['HTTP_HOST']) && isset($_GET['testData'])) {
  // header("HTTP/1.1 500 I can't do that...");
  // echo "I can't do that...";
  // exit;
  require('testData.php');
  exit;
}

require_once('Log.php');
require_once('App.php');

// Handle uncaught exceptions amd PHP errors using custom error page
function handleException(Exception $e) {
  if (class_exists('App')) {
    App::log($e);
    App::respondError($e);
  } else {
    echo "Uh oh, there was a bad error! Please report this to our support staff!";
    exit;
  }
}
set_exception_handler('handleException');

function handleError($code, $msg, $file, $line, array $context) {
  if ($code > E_COMPILE_WARNING) { return; }
  
  if ($code >= E_ERROR) {
    if (class_exists('App')) {
      App::log("Error in $file on $line: $msg", PEAR_LOG_CRIT);
      if (App::isProd()) {
        App::respondError("Sorry, but it looks like there was a serious error. Please contact us for assistance.");
      } else {
        App::respondError("Error in $file on $line: $msg");
      }
    } else {
      echo "Uh oh, there was a nasty error! Please report this to our support staff!";
      exit;
    }
  }
}
set_error_handler('handleError');

// Handle incoming requests
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  
  // Are they looking for a particular event?
  if (isset($_GET['id']) && strlen($_GET['id'])) {
    App::findEvent($_GET);
  } else {
    // Default is to get all events using the params
    App::findEvents($_GET);
  }

} else {
  // We don't handle other request types just yet
  throw new BadMethodCallException("Sorry, only GET requests are supported currently.", 405);
}


?>