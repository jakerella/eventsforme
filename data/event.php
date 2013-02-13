<?php

require_once('_open.php');

// FOR TESTING
if (preg_match("/^test\./", $_SERVER['HTTP_HOST']) && isset($_GET['testData'])) {
  // header("HTTP/1.1 500 I can't do that...");
  // echo "I can't do that...";
  // exit;
  require('testData.php');
  exit;
}

// Handle incoming requests
if ($_SERVER['REQUEST_METHOD'] == 'GET') {

  // Are they looking for a particular event?
  if (isset($_GET['id']) && strlen($_GET['id'])) {
    respond(App::findEvent($_GET));
  } else {
    // Default is to get all events using the params
    respond(App::findEvents($_GET));
  }

} else {
  // We don't handle other request types just yet
  throw new BadMethodCallException("Sorry, only GET requests are supported currently.", 405);
}


?>