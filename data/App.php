<?php

require_once('lib/CouchCache.php');
require_once('sources/EventSource.php');

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
  const LOG_LOCATION_PROD = '/home/jordan/logs/efm_main.log';
  const LOG_LEVEL_TEST = PEAR_LOG_DEBUG;
  const LOG_LEVEL_PROD = PEAR_LOG_DEBUG;

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
    'mu' => 'MeetupSource'

    // Yahoo - http://upcoming.yahoo.com/services/api/event.search.php
    // Eventbrite - http://developer.eventbrite.com/doc/events/event_search/
    // Eventful - http://api.eventful.com/docs/events/search
    // Google Places - https://developers.google.com/places/documentation/details
    // Zvents - http://corporate.zvents.com/products/mobile_api.html
    // Goodreads - http://www.goodreads.com/api#events.list ... not sure about this one...

  );


  // -------------------- Handle Incoming Request --------------------- //

  public static function findEvents(array $params = null) {
    $params = array_merge(
      EventSource::$defaultParams,
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


    // Build the unique search ID from the params
    $terms = '';
    if ($params['terms']) {
      $terms = preg_replace("/ /", '+', $params['terms']);
      $terms = preg_replace("/\//", '',$terms);
      $terms = urlencode($terms)."-";
    }
    $lat = round($params['lat'], 2);
    $lng = round($params['lng'], 2);
    $sid = strtolower("search-".$terms.$lat."-".$lng."-".$params['time']."-".$params['dist']."-".$params['page']);


    // use cached search results if available
    try {
      $resultCache = self::getCache(self::SEARCH_CACHE)->getById($sid);
      self::log("Using cached search results for ".$sid);
      
      // respond with our results
      self::respond($resultCache->events);

    } catch (NotFoundException $nfe) {
      // let these go, just means we need search for these fresh
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      self::log($ce);
    }


    // Get Events fresh from all sources if not in cache
    $allEvents = array();
    foreach (self::$sources as $prefix => $class) {
      self::loadSource($class);
      $source = new $class(self::$logger);

      try {
        $sourceEvents = $source->getEvents($params);
        if (is_array($sourceEvents)) {
          self::log("Found ".sizeof($sourceEvents)." ".$source->name." events on sid: {$sid}");
          $allEvents = array_merge($allEvents, $sourceEvents);
        }
      } catch (Exception $e) {
        // Let Exceptions on an individual source go so that the whole request doesn't crash
        self::log($e);
      }
    }

    // go through all events and ignore apparent duplicates
    $events = array(); // our final array
    $vagueIds = array(); // title | start date | location
    foreach ($allEvents as $event) {
      $vagueId = $event['title']."|".date("Y-m-d", strtotime($event['start']))."|".$event['location'];
      if (in_array($vagueId, $vagueIds)) {
        self::log("Ignoring possible duplicate events: {$vagueId}");
        continue;
      }
      array_push($vagueIds, $vagueId);
      array_push($events, $event);
    }
    unset($vagueIds);
    unset($allEvents);


    // add new search results to cache
    try {
      self::getCache(self::SEARCH_CACHE)->create($sid, array('events'=>$events), self::SEARCH_CACHE_TTL); // cache for a few hours
      self::log("Cached new search result data for ".$sid);
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      self::log($ce);
    }

    // respond with our results
    self::respond($events);
  }


  public static function findEvent(array $params) {
    $event = null;

    self::log("Getting single event using params: ".json_encode($params));

    if (isset($params['id']) && strlen($params['id']) > 2) {
      $type = substr($params['id'], 0, 2);
      if (self::$sources[$type]) {

        // TODO: use cache if possible

        self::loadSource(self::$sources[$type]);
        $source = new self::$sources[$type](self::$logger);
        $event = $source->getEventByGUID($params['id']);

        // TODO: add to cache if necessary
        
      }
    }

    self::respond($event);
  }


  // ------------------------- Various Helpers ----------------------- //
  
  public static function isProd() {
    return !preg_match("/^test\./", $_SERVER['HTTP_HOST']);
  }

  private static function getCache($type) {
    if (!self::isProd() && !self::TEST_CACHE) {
      return (new FakeCache());
    } else {
      if (!isset(self::$cache[$type])) {
        self::$cache[$type] = new CouchCache($type."-cache");
      }
      return self::$cache[$type];
    }
  }

  private static function loadSource($class) {
    if (file_exists("sources/{$class}.php")) {
      require_once("sources/{$class}.php");
    } else {
      throw new InvalidArgumentException("Sorry, but that is not a valid event source!");
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

    return self::$logger->log($msg, $level);
  }


  public static function geocode($input) {
    $coor = null;
    if (!$input || !strlen($input)) { return $coor; }

    $addr = preg_replace("/ /", '+',$input);
    $addr = preg_replace("/\//", '',$addr);
    $addr = urlencode($addr);

    // use cached geocode data if available
    try {
      $geoCache = self::getCache(self::GEO_CACHE)->getById("geocode-".strtolower($addr));
      if (isset($geoCache->latitude) && isset($geoCache->longitude)) {
        self::log("Using cached geocode data for ".$addr);
        return array(
          'latitude' => $geoCache->latitude,
          'longitude' => $geoCache->longitude
        );
      }
    } catch (NotFoundException $nfe) {
      // let these go, just means we need geocode this one fresh
    } catch (CouchException $ce) {
      // We don't want to fail just because the cache failed...
      self::log($ce);
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

      self::log("Google geocoding failed with value: ".$respJson['status'], PEAR_LOG_WARNING);
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
        self::log("Caching new geocode data for ".$addr);
        self::getCache(self::GEO_CACHE)->create("geocode-".strtolower($addr), $coor, self::GEOCODE_CACHE_TTL);
      } catch (CouchException $ce) {
        // We don't want to fail just because the cache failed...
        self::log($ce);
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