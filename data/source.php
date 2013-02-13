<?php

require_once('_open.php');

// Handle incoming requests
if ($_SERVER['REQUEST_METHOD'] == 'GET') {

  // Default is to get all sources
  respond(App::getAllSources());

} else {
  // We don't handle other request types just yet
  throw new BadMethodCallException("Sorry, only GET requests are supported currently.", 405);
}


?>