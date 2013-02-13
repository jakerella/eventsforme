<?php

require_once('Log.php');
require_once('App.php');

// Handle uncaught exceptions amd PHP errors using custom error page
function handleException(Exception $e) {
  if (class_exists('App')) {
    App::log($e);
    respondError($e);
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
        respondError("Sorry, but it looks like there was a serious error. Please contact us for assistance.");
      } else {
        respondError("Error in $file on $line: $msg");
      }
    } else {
      echo "Uh oh, there was a nasty error! Please report this to our support staff!";
      exit;
    }
  }
}
set_error_handler('handleError');


// -------------------- Response & Error Handling ------------------ //
  
/**
 * Determines the protocol used by this client
 * 
 * @return String
 */
function getProtocol() {
  $protocol = "HTTP/1.1";
  if(isset($_SERVER['SERVER_PROTOCOL'])) {
    $protocol = $_SERVER['SERVER_PROTOCOL'];
  }
  return $protocol;
}

/**
 * Sends a response to the client. Used primarily for API calls
 * 
 * @param Object $responseBody The body to send back, will be json encoded
 * @return void
 */
function respond($results, $code = 200, $statusMsg = "Success") {
  $protocol = getProtocol();
  
  if (!headers_sent()) {
    header("$protocol $code $statusMsg");
  } else {
    echo "; ";
  }
  
  if ($code == 200) {
    header("Content-Type: application/json");
    
    $resp = array(
      'success' => true,
      'results' => $results
    );

    echo json_encode($resp);

  } else {
    echo $results;
  }
  exit;
}

$STATUS_CODES = array(
  400 => "Bad Request - Please view documentation for proper request syntax",
  401 => "Unauthorized - You are not authorized to access this resource",
  403 => "Forbidden - Access to this resource is forbidden",
  404 => "Not Found - That resource is not available",
  405 => "Method Not Allowed - The method used is not allowed for this resource",
  500 => "Server Error - Please contact the site administrator",
  501 => "Not Implemented - Please view documentation for available resources and actions",
  503 => "Unavailable - This system is currently unavailable"
);

/**
 * Sets an error header and response body based on the message or exception
 * 
 * @param String | Exception $error The error message or exception
 * @param Int $code The HTTP status code to use
 * @return void
 */
function respondError($msgOrException, $code = null) {
  $protocol = getProtocol();
  
  $msg = $msgOrException;
  if ($msgOrException instanceof Exception) {
    $msg = $msgOrException->getMessage();
    $c = $msgOrException->getCode();
    if (!$code && $c) { $code = $c; }
  }
  if (!$code) { $code = 500; }
  
  self::respond($msg, $code, ((isset($STATUS_CODES[$code]))?$STATUS_CODES[$code]:"Error"));
}

?>
