<?php

require_once('lib/CouchCache.php');

class App {
  // FOR TESTING
  const TEST_CACHE = false; // set to true to use real CouchCache (only used in TEST)
  // Some constants
  const DEFAULT_DIST = 10;
  const DEFAULT_DAYS = 7;
  const SEARCH_CACHE_TTL = 10800; // 3 hours
  const GEOCODE_CACHE_TTL = 2592000; // 30 days
  const SEARCH_CACHE = "search";
  const GEO_CACHE = "geo";
  const EMAIL = "jordan@jordankasper.com";
  const GOOGLE_API_KEY = "AIzaSyAcriS9XJQ1e-LRixsdEZ4OmahIbG8Xmqw";
  const LOG_LOCATION_TEST = '/var/log/jk/efm.log';
  const LOG_LOCATION_PROD = '/home/events/logs/main.log';
  const LOG_LEVEL_TEST = PEAR_LOG_DEBUG;
  const LOG_LEVEL_PROD = PEAR_LOG_INFO;

  // Various static members
  private static $cache = array();
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
    'mu' => array(
      'name' => 'Meetup',
      'site' => 'http://www.meetup.com',
      'apiKey' => '784c1c303d407a4f674272f2ee2e24',
      'defaultCategory' => 'Meetup',
      'guidPrefix' => 'mu'
    )

  );


  // -------------------- Handle Incoming Request --------------------- //

  public static function findEvents(array $params) {
    $params = array_merge(
      array('terms'=>null, 'loc'=>null, 'lat'=>null, 'lng'=>null, 'time'=>self::DEFAULT_DAYS, 'dist'=>self::DEFAULT_DIST, 'page'=>1), 
      ($params)?$params:array()
    );

    self::log("Getting events using params: ".json_encode($params));

    // convert location to lat/lng
    $m = array();
    if (isset($params['lat']) && isset($params['lng']) && 
        is_numeric($params['lat']) && is_numeric($params['lng'])) {
      // Use the values as they are
      $params['lat'] = floatval($params['lat']);
      $params['lng'] = floatval($params['lng']);

    } else if (preg_match("/^[ ]*(\-?[0-9]{1,3}\.[0-9]{2,15})\,[ ]*(-[0-9]{1,3}\.[0-9]{2,15})[ ]*$/", $params['loc'], $m)) {
      $params['loc'] = null;
      $params['lat'] = floatval($m[1]);
      $params['lng'] = floatval($m[2]);

    } else if (isset($params['loc']) && strlen($params['loc'])) {

      $coor = self::geocode($params['loc']);
      if ($coor && sizeof($coor) == 2) {
        $params['lat'] = floatval($coor['latitude']);
        $params['lng'] = floatval($coor['longitude']);
      }

    } else {
      throw new InvalidArgumentException("Sorry, but you must provide a location to search in!", 400);
    }

    if (!$params['lat'] || !$params['lng']) {
      throw new InvalidArgumentException("Sorry, but weren't able to determine your location! Can you try again?", 400);
    }

    // our result array
    $events = array();


    // Build the unique search ID from the params
    $terms = '';
    if ($params['terms']) {
      $terms = preg_replace("/ /", '+', $params['terms']);
      $terms = preg_replace("/\//", '',$terms);
      $terms = urlencode($terms)."-";
    }
    $lat = round($params['lat'], 2);
    $lng = round($params['lng'], 2);
    $sid = "search-".$terms.$lat."-".$lng."-".$params['time']."-".$params['dist']."-".$params['page'];

    // use cached search results if available
    try {
      $resultCache = self::getCache(self::SEARCH_CACHE)->getById($sid);
      App::log("Using cached search results for ".$sid);
      
      self::respond($resultCache->events);

    } catch (NotFoundException $nfe) {
      // let these go, just means we need geocode this one fresh
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      App::log($ce);
    }

    // Get Events fresh from all sources
    foreach (self::$sources as $name => $info) {
      $events = array_merge($events, call_user_func(
        array('App', "get{$info['name']}Events"),
        $info,
        $params
      ));
    }

    // add search results to cache
    try {
      App::log("Caching new search result data for ".$sid);
      self::getCache(self::SEARCH_CACHE)->create($sid, array('events'=>$events), self::SEARCH_CACHE_TTL); // cache for a few hours
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      App::log($ce);
    }

    self::respond($events);
  }


  public static function findEvent(array $params) {
    $event = null;

    self::log("Getting single event using params: ".json_encode($params));

    if (isset($params['id'])) {
      $m = array();
      if (preg_match("/([a-z0-9]+)\-([0-9]{8})\-(.+)/", $params['id'], $m)) {
        if (self::$sources[$m[1]]) {
          $event = call_user_func(
            array('App', "get".self::$sources[$m[1]]['name']."Event"),
            $m[3],
            self::$sources[$m[1]],
            $params
          );
        }
      }
    }

    self::respond($event);
  }


  // ----------------- Handlers For All Event Sources ----------------- //
  
  public static function getMeetupEvents($info, $params) {
    $events = array();

    $url = "https://api.meetup.com/2/open_events?".
           "key={$info['apiKey']}".
           "&lat={$params['lat']}".
           "&lon={$params['lng']}".
           "&radius={$params['dist']}".
           "&status=upcoming".
           "&page=40".
           "&sign=true";

    if ($params['terms']) {
      $url .= "&text=".urlencode($params['terms'])."&and_text=true";
    }

    if (isset($params['time'])) {
      $url .= "&time=,".$params['time']."d";
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
      $respJson = json_decode(utf8_encode($response));

      // Handle results
      if (isset($respJson->results) && sizeof($respJson->results) > 0) {
        App::log("Found ".sizeof($respJson->results)." MEETUP events");
        foreach ($respJson->results as $result) {
          $event = self::processMeetupEventResult($result, $info, $params);
          if ($event) {
            array_push($events, $event);
          }
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

  public static function getMeetupEvent($id, $info, $params) {
    $event = null;

    $url = "https://api.meetup.com/2/event/$id?".
           "key={$info['apiKey']}".
           "&page=1".
           "&sign=true";

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
      $result = json_decode(utf8_encode($response));

      $event = self::processMeetupEventResult($result, $info, $params);
      
    } else if ($status == 400) {
      self::log("Bad request to api.meetup.com: ".$response, PEAR_LOG_WARNING);
    } else if ($status == 401) {
      self::log("Bad API key for api.meetup.com: ".$info['apiKey'], PEAR_LOG_ERR);
    } else if ($status > 499) {
      self::log("Server error from api.meetup.com: ".$response, PEAR_LOG_ERR);
    } else {
      self::log("Unknown error ($status) from api.meetup.com: ".$response, PEAR_LOG_ERR);
    }
    
    return $event;
  }

  private static function processMeetupEventResult($result, $info, $params) {
    $event = null;

    if (isset($result->time) && is_numeric($result->time)) {
      $start = round($result->time / 1000);
    } else {
      App::log("MEETUP: no (or bad) start time (".$result->time.")");
      return null;
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
      $addr = $result->venue->address_1.", ".$result->venue->city.", ".$result->venue->state;
    }

    $event = array(
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
    );

    return $event;
  }


  // ------------------------- Various Helpers ----------------------- //
  
  public static function isProd() {
    return !preg_match("/^test\./", $_SERVER['HTTP_HOST']);
  }

  public static function getCache($type) {
    if (!self::isProd() && !self::TEST_CACHE) {
      return (new FakeCache());
    } else {
      if (!isset(self::$cache[$type])) {
        self::$cache[$type] = new CouchCache($type."-cache");
      }
      return self::$cache[$type];
    }
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
    
    $trace = "";
    if ($msgOrException instanceof Exception) {
      if ($msgOrException instanceof InvalidArgumentException ||
          $msgOrException instanceof BadMethodCallException) {
        $level = ($level === null)?PEAR_LOG_DEBUG:$level;
      } else {
        $level = ($level === null)?PEAR_LOG_ERR:$level;
      }
      $msg = get_class($msgOrException)." on line ".$msgOrException->getLine()." of ".$msgOrException->getFile().": ".$msgOrException->getMessage();
      $trace = $msgOrException->getTraceAsString();

    } else {
      $msg = $msgOrException;
      $trace = var_export(debug_backtrace(), true);
    }

    if (self::isProd() && $level <= PEAR_LOG_ERR) {
      $headers = "From: eventsfor.me logger <noreply@eventsfor.me>\n".
                   "MIME-Version: 1.0\n".
                   "Content-type: text/plain; charset=utf-8\n";
      $message = "Hello,\n\nThere was a message logged at or above your indicated email level (".PEAR_LOG_ERR."). ".
                 "See below for the full content of the error.\n\n".
                 "Time: ".date("Y-m-d H:i:s")."\n".
                 "User IP: ".((isset($_SERVER['REMOTE_ADDR']))?$_SERVER['REMOTE_ADDR']:'(unknown)')."\n".
                 "Message: $msg\n".
                 "Stack Trace:\n".$trace."\n".
                 "This log message will also appear in the log file.\n\n".
                 "Thanks,\n--Logger";
      // I'd rather not crash the app if the email fails
      @mail(self::EMAIL, "eventsfor.me error ({$level})", $message, $headers);
    }

    $level = ($level === null)?PEAR_LOG_DEBUG:$level;
    $ip = (isset($_SERVER['REMOTE_ADDR']))?$_SERVER['REMOTE_ADDR']:'(unknown IP)';
    $msg = $ip." ".$msg;

    self::$logger->log($msg, $level);
  }

  public static function geocode($input) {
    $coor = null;
    if (!$input || !strlen($input)) { return $coor; }

    $addr = preg_replace("/ /", '+',$input);
    $addr = preg_replace("/\//", '',$addr);
    $addr = urlencode($addr);

    // use cached geocode data if available
    try {
      $geoCache = self::getCache(self::GEO_CACHE)->getById("geocode-".$addr);
      if (isset($geoCache->latitude) && isset($geoCache->longitude)) {
        App::log("Using cached geocode data for ".$addr);
        return array(
          'latitude' => $geoCache->latitude,
          'longitude' => $geoCache->longitude
        );
      }
    } catch (NotFoundException $nfe) {
      // let these go, just means we need geocode this one fresh
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      App::log($ce);
    }
    
    $url = "http://maps.googleapis.com/maps/api/geocode/json?address=".$addr."&sensor=false";

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    $resp = curl_exec($ch);
    $respJson = json_decode($resp, true);

    if ($respJson['status'] == 'ZERO_RESULTS') {

      return $coor;

    } else if ($respJson['status'] == 'OVER_QUERY_LIMIT') {

      throw new DomainException("Google geocoding call returned OVER_QUERY_LIMIT", 503);

    } else if ($respJson['status'] != 'OK') {

      App::log("Google geocoding failed with value: ".$respJson['status'], PEAR_LOG_WARNING);
      return $coor;

    } else {
      // "OK" response, so use values
      $geometry = $respJson['results'][0]['geometry'];

      $coor = array(
        'latitude' => $geometry['location']['lat'],
        'longitude' => $geometry['location']['lng']
      );

      // cache result for use later
      try {
        App::log("Caching new geocode data for ".$addr);
        self::getCache(self::GEO_CACHE)->create("geocode-".$addr, $coor, self::GEOCODE_CACHE_TTL);
      } catch (CouchException $ce) {
        // We don't want to fail just because the cache failed...
        App::log($ce);
      }
    }

    return $coor;
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

} // End of App class


// Fake cacher for use in test (when enabled)
class FakeCache {
  public function getById($id) {
    throw new NotFoundException("No cache in test", 408);
  }

  public function getAll() {
    throw new NotFoundException("No cache in test", 408);
  }

  public function create($id, $data, $ttl = null) {
    $result = new stdClass();
    $result->ok = true;
    $result->id = $id;
    return $result;
  }

  public function update($id, $data) {
    $result = new stdClass();
    $result->ok = true;
    $result->id = $id;
    return $result;
  }

  public function deleteById($idOrItem) {
    $result = new stdClass();
    $result->ok = true;
    if (is_object($idOrItem)) { $id = $idOrItem->_id; }
    if (is_array($idOrItem)) { $id = $idOrItem['_id']; }
    if (is_string($idOrItem)) { $id = $idOrItem; }
    $result->id = $id;
    return $result;
  }

  public function deleteAll() {
    $result = new stdClass();
    $result->ok = true;
    return $result;
  }
}

?>