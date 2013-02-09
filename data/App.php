<?php

class App {
  // Some constants
  const DEFAULT_DIST = 20;
  const LOG_LOCATION_TEST = '/var/log/jk/efm.log';
  const LOG_LOCATION_PROD = '/home/events/logs/main.log';
  const LOG_LEVEL_TEST = PEAR_LOG_DEBUG;
  const LOG_LEVEL_PROD = PEAR_LOG_INFO;

  // Various static members
  private static $logger;
  public static $STATUS_CODES = array(
    400 => "Bad Request - Please view documentation for proper request syntax",
    401 => "Unauthorized - You are not authorized to access this resource",
    403 => "Forbidden - Access to this resource is forbidden",
    404 => "Not Found - That resource is not available",
    405 => "Method Not Allowed - The method used is not allowed for this resource",
    500 => "Server Error - Please contact the site administrator",
    501 => "Not Implemented - Please view documentation for available resources and actions",
    503 => "Unavailable - This system is currently unavailable"
  );


  // ------------------- Event Source Definition --------------------- //
  
  public static $sources = array(
    'meetup' => array(
      'apiKey' => '784c1c303d407a4f674272f2ee2e24',
      'name' => 'Meetup',
      'site' => 'http://www.meetup.com',
      'defaultCategory' => 'Meetup',
      'guidPrefix' => 'mu'
    )

  );


  // -------------------- Handle Incoming Request --------------------- //

  public static function findEvents(array $params) {
    $params = array_merge(
      array('terms'=>null, 'loc'=>null, 'lat'=>null, 'lng'=>null, 'dist'=>self::DEFAULT_DIST), 
      ($params)?$params:array()
    );

    self::log("Getting events using params: ".json_encode($params));

    if (!isset($params['loc']) || strlen($params['loc']) < 1) {
      throw new InvalidArgumentException("Sorry, but you must provide a location to search in!", 400);
    }

    // convert location to lat/lng
    $m = array();
    if (preg_match("/^[ ]*(\-?[0-9]{1,3}\.[0-9]{2,15})\,[ ]*(-[0-9]{1,3}\.[0-9]{2,15})[ ]*$/", $params['loc'], $m)) {
      $params['lat'] = $m[1];
      $params['lng'] = $m[2];

    } else {
      // try to get lat/lng from google?
    }

    if (!$params['lat'] || !$params['lng']) {
      throw new InvalidArgumentException("Sorry, but weren't able to determine your location! Can you try again?", 400);
    }

    $events = array();

    foreach (self::$sources as $name => $info) {
      $events = array_merge($events, call_user_func(
        array('App', "get{$info['name']}Events"),
        $info,
        $params
      ));
    }

    // TODO: implement search cache

    self::respond($events);
  }


  // ----------------- Handlers For All Event Sources ----------------- //
  
  public static function getMeetupEvents($info, $params) {
    self::log("Getting Meetup events using ".json_encode($info));
    $events = array();

    $url = "https://api.meetup.com/2/open_events?".
           "key={$info['apiKey']}".
           "&lat={$params['lat']}".
           "&lon={$params['lng']}".
           "&radius={$params['dist']}".
           "&status=upcoming".
           "&page=5".
           "&sign=true";
    if ($params['terms']) {
      $url .= "&text={$params['terms']}&and_text=true";
    }

    // send the request
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    // process the response
    if ($status == 200) {
      $respJson = json_decode($response);

      // Handle results
      if (isset($respJson->results) && sizeof($respJson->results) > 0) {
        foreach ($respJson->results as $result) {
          if (isset($result->time) && is_numeric($result->time)) {
            $start = round($result->time / 1000);
          } else {
            continue;
          }
          $end = null;
          if (isset($result->duration) && is_numeric($result->duration)) {
            $end = round($start + ($result->duration / 1000));
          }

          if (isset($result->venue) && isset($result->venue->lat) && is_numeric($result->venue->lat)) {
            $lat = $result->venue->lat;
            $lng = $result->venue->lon;
          } else {
            $lat = $params['lat'];
            $lng = $params['lng'];
          }

          $loc = null;
          if (isset($result->venue) && isset($result->venue->name) && strlen($result->venue->name)) {
            $loc = $result->venue->name;
          }
          $addr = null;
          if (isset($result->venue) && isset($result->venue->address_1) && strlen($result->venue->address_1)) {
            $addr = $result->venue->address_1.", ".$result->venue->city;
          }

          array_push($events, array(
            'id' => $info['guidPrefix'].'-'.date('Ymd', $start).'-'.$result->id,
            'title' => $result->name,
            'description' => $result->description,
            'category' => 'Meetup',
            'link' => $result->event_url,
            'location' => $loc,
            'address' => $addr,
            'start' => date('Y-m-d H:i:s', $start),
            'end' => (($end)?date('Y-m-d H:i:s', $end):null),
            'lat' => $lat,
            'lng' => $lng
          ));
        }
      }
      
    } else if ($status == 400) {
      self::log("Bad request to api.meetup.com: ".$response, PEAR_LOG_WARNING);
    } else if ($status == 401) {
      self::log("Bad API key for api.meetup.com: ".$info['apiKey'], PEAR_LOG_ERR);
    } else if ($status > 499) {
      self::log("Server error from api.meetup.com: ".$response, PEAR_LOG_ERR);
    } else {
      self::log("Unknown error ($status) from api.meetup.com: ".$response, PEAR_LOG_ERR);
    }
    
    return $events;
  }



  // ------------------------- Various Helpers ----------------------- //
  
  public static function isProd() {
    return !preg_match("/^test\./", $_SERVER['HTTP_HOST']);
  }

  public static function log($msgOrException, $level = null) {
    if (!self::$logger) {
      self::$logger = Log::singleton(
        'file', 
        ((self::isProd())?self::LOG_LOCATION_PROD:self::LOG_LOCATION_TEST), 
        'efm-app', 
        array(
          'mode' => 0660,
          'lineFormat' => '%{timestamp} %{priority} %{message}',
          'timeFormat' => '%F %T'
        ),
        ((self::isProd())?self::LOG_LEVEL_PROD:self::LOG_LEVEL_TEST)
      );
    }
    
    if ($msgOrException instanceof Exception) {
      if ($msgOrException instanceof InvalidArgumentException ||
          $msgOrException instanceof BadMethodCallException) {
        $level = ($level === null)?PEAR_LOG_DEBUG:$level;
      } else {
        $level = ($level === null)?PEAR_LOG_ERR:$level;
      }
      $msg = get_class($msgOrException)." on line ".$msgOrException->getLine()." of ".$msgOrException->getFile().": ".$msgOrException->getMessage();

    } else {
      $msg = $msgOrException;
    }

    $level = ($level === null)?PEAR_LOG_DEBUG:$level;
    $ip = (isset($_SERVER['REMOTE_ADDR']))?$_SERVER['REMOTE_ADDR']:'(unknown IP)';
    $msg = $ip." ".$msg;

    self::$logger->log($msg, $level);
  }


  // -------------------- Response & Error Handling ------------------ //
  
  /**
   * Determines the protocol used by this client
   * 
   * @return String
   */
  public static function getProtocol() {
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
  public static function respond($results, $code = 200, $statusMsg = "Success") {
    $protocol = self::getProtocol();
    
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
  
  /**
   * Sets an error header and response body based on the message or exception
   * 
   * @param String | Exception $error The error message or exception
   * @param Int $code The HTTP status code to use
   * @return void
   */
  public static function respondError($msgOrException, $code = null) {
    $protocol = self::getProtocol();
    
    $msg = $msgOrException;
    if ($msgOrException instanceof Exception) {
      $msg = $msgOrException->getMessage();
      $c = $msgOrException->getCode();
      if (!$code && $c) { $code = $c; }
    }
    if (!$code) { $code = 500; }
    
    self::respond($msg, $code, ((isset(self::$STATUS_CODES[$code]))?self::$STATUS_CODES[$code]:"Error"));
  }

}

?>