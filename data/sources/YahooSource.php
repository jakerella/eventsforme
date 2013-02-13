<?php

require_once('EventSource.php');
require_once('lib/CouchCache.php');

class YahooSource extends EventSource {

  const API_KEY = "87f1f08c57";
  const CAT_CACHE = "yahoo-cat-cache";
  const CAT_CACHE_TTL = 2592000; // 30 days

  public $name = 'Yahoo Upcoming';
  public $site = 'http://upcoming.yahoo.com/';
  public $defaultCategory = 'Event';
  private $cache = null;
  private $cacheAttempted = false;

  public function __contruct($logger = null) {
    parent::__construct($logger);
  }

  public function getGUIDPrefix() {
    return 'yh';
  }

  public function getCatCache() {
    // See if we have the Yahoo categories... if not, do request, store in cache
    if (!$this->cache && !$this->cacheAttempted) {
      $this->cacheAttempted = true;
      try {
        $this->cache = new CouchCache(self::CAT_CACHE);
        if ($this->cache) {
          $allDocs = $this->cache->getAll();
          if (!$allDocs->total_rows) {
            $this->populateCache();
          }
        }
      } catch (Exception $e) {
        // We don't want to fail just because the cache failed...
        self::log($e);
      }
    }

    return $this->cache;
  }

  public function populateCache() {
    $url = "http://upcoming.yahooapis.com/services/rest/?".
           "method=category.getList".
           "&api_key=".self::API_KEY.
           "&format=json";

    self::log("populating Yahoo categories from {$url}");

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

      if ($respJson && isset($respJson->rsp) && isset($respJson->rsp->category)) {

        foreach ($respJson->rsp->category as $cat) {
          try {
            $this->cache->create("yahoo-cat-".$cat->id, array('name'=>$cat->name, 'description'=>$cat->description), self::CAT_CACHE_TTL); // cache for a while
          } catch (Exception $e) {
            // We don't want to fail just because the cache failed...
            self::log($e);
          }
        }

      } else {
        $this->cache = null;
      }

    } else {
      $this->cache = null;
    }
  }

  public function getEvents(array $params = null) {
    $params = array_merge(
      EventSource::$defaultParams,
      ($params)?$params:array()
    );

    $events = array();

    $url = "http://upcoming.yahooapis.com/services/rest/?".
           "method=event.search".
           "&api_key=".self::API_KEY.
           "&location=".urlencode($params['lat'].", ".$params['lng']).
           "&radius={$params['dist']}".
           "&min_date=".date("Y-m-d").
           "&per_page=".self::DEFAULT_PAGE_SIZE.
           "&flags=T".
           "&format=json";

    if ($params['terms']) {
      $url .= "&search_text=".urlencode($params['terms']);
    }

    if (isset($params['time']) && is_numeric($params['time'])) {
      $url .= "&max_date=".date("Y-m-d", (time() + (86400 * $params['time'])));
    }

    self::log("Sending request for Yahoo events to {$url}");

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

      if ($respJson && isset($respJson->rsp)) {
        if (!isset($respJson->rsp->stat) || $respJson->rsp->stat != 'ok') {
          if (isset($respJson->rsp->error)) {
            $this->handleBadResponse(551, $response);
          } else {
            $this->handleBadResponse(552, "Unknown error from Yahoo API");
          }
        } else {
          // Handle results
          if (isset($respJson->rsp->event) && sizeof($respJson->rsp->event) > 0) {
            foreach ($respJson->rsp->event as $result) {
              $event = $this->processEventResult($result);
              if ($event) {
                array_push($events, $event);
              }
            }
          }
        }
      } else {
        $this->handleBadResponse(553, "Invalid Yahoo response and/or JSON: $response");
      }
      
    } else {
      $this->handleBadResponse($status, $response);
    }
    
    return $events;
  }

  public function getEventByGUID($guid) {
    if (!$guid || !strlen($guid)) {
      throw new InvalidArgumentException("Please provide a valid ".$this->name." Event GUID to look up", 400);
    }
    $sId = $this->getSourceId($guid);
    if (!$sId) {
      throw new InvalidArgumentException("That is not a valid ".$this->name." GUID", 400);
    }

    $event = null;

    $url = "http://upcoming.yahooapis.com/services/rest/?".
           "method=event.getInfo".
           "&api_key=".self::API_KEY.
           "&event_id=".$sId.
           "&flag=T".
           "&format=json";

    self::log("Sending request for single ".$this->name." event: {$url}");

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
      $result = json_decode($response);

      if ($result && isset($result->rsp)) {
        if (!isset($result->rsp->stat) || $result->rsp->stat != 'ok') {
          if (isset($result->rsp->error)) {
            $this->handleBadResponse(551, $response);
          } else {
            $this->handleBadResponse(552, "Unknown error from Yahoo API");
          }
        } else {
          // Handle results
          if (isset($result->rsp->event) && sizeof($result->rsp->event) == 1) {
            $event = $this->processEventResult($result->rsp->event[0]);
          }
        }
      } else {
        $this->handleBadResponse(553, "Invalid Yahoo response and/or JSON");
      }
      
    } else {
      $this->handleBadResponse($status, $response);
    }

    if (!$event) {
      throw new NotFoundException("Unable to find ".$this->name." event with GUID: {$guid}");
    }
    
    return $event;
  }

  private function processEventResult($result) {
    $event = null;

    if (isset($result->start_date) && strlen($result->start_date)) {
      $startStr = $result->start_date;
      if (isset($result->start_time) && strlen("".$result->start_time) > 2) {
        $startStr .= " ".$result->start_time;
      }
      $start = strtotime($startStr);
      if (!$start) {
        self::log($this->name.": invalid start time string ({$startStr})");
        return null;
      }

    } else {
      self::log($this->name.": no (or bad) start time (".$result->start_date.")");
      return null;
    }

    $end = null;
    if (isset($result->end_date) && strlen($result->end_date)) {
      $end = $result->end_date;
      if (isset($result->end_time) && strlen("".$result->end_time) > 2) {
        $end .= " ".$result->end_time;
      }
      $end = strtotime($end);

    } else if (isset($result->end_time) && strlen("".$result->end_time) > 2) {
      // if no end date, but we have an end time, assume same date
      $end = strtotime($result->start_date." ".$result->end_time);
    }

    $lat = null;
    $lng = null;
    if (isset($result->latitude) && isset($result->longitude)) {
      $lat = $result->latitude;
      $lng = $result->longitude;
    }

    $loc = null;
    if (isset($result->venue_name) && strlen($result->venue_name)) {
      $loc = $result->venue_name;
    }
    $addr = null;
    if (isset($result->venue_address) && strlen($result->venue_address)) {
      $addr = $result->venue_address.", ".$result->venue_city.", ".$result->venue_state_code;
    }

    $cat = $this->defaultCategory;
    if (isset($result->category_id) && strlen($result->category_id) && $this->getCatCache()) {
      $cats = preg_split("/;/", $result->category_id);

      $newCat = array();
      foreach ($cats as $cid) {
        // See if the category is in the cache
        try {
          
          $catCache = $this->getCatCache()->getById("yahoo-cat-".$cid);
          $newCat[] = $catCache->name;

        } catch (Exception $e) {
          // We don't want to fail just because the cache failed...
          self::log($e);
        }
      }
      if (sizeof($newCat)) {
        $cat = implode(', ', $newCat);
      }
    }

    $tickets = false;
    $tLink = null;
    $cost = null;
    if (isset($result->ticket_price) && strlen($result->ticket_price)) {
      $m = array();
      if (preg_match("/(^|\$|\s)[0-9\,\.]+($|\s)/", $result->ticket_price, $m)) {
        $cost = floatval($m[0]);
      }
    }
    if (isset($result->ticket_url) && strlen($result->ticket_url)) {
      $tickets = true;
      $tLink = $result->ticket_url;
    }

    $event = array(
      'id' => $this->getGUID($result->id, $start),
      'title' => $result->name,
      'description' => nl2br($result->description),
      'category' => $cat,
      'source' => $this->name,
      'link' => ((isset($result->url))?$result->url:"http://upcoming.yahoo.com/event/".$result->id),
      'location' => $loc,
      'address' => $addr,
      'start' => date('Y-m-d H:i:s', $start),
      'end' => (($end)?date('Y-m-d H:i:s', $end):null),
      'tickets' => $tickets,
      'ticket_link' => $tLink,
      'cost' => $cost,
      'lat' => $lat,
      'lng' => $lng
    );

    return $event;
  }

  private function handleBadResponse($status = 500, $response = "") {
    if ($status > 499) {
      self::log("Server error from ".$this->name." API: ".$response, PEAR_LOG_ERR);
    } else if ($status == 404) {
      self::log("Not Found error from ".$this->name." API: ".$response, PEAR_LOG_ERR);
    } else {
      self::log("Unknown error ($status) ".$this->name." API: ".$response, PEAR_LOG_ERR);
    }
  }

}

/*
EXAMPLE RETURN DATA FROM YAHOO API

{
  "rsp": {
    "event": [
      {
        "category_id" : 2,
        "date_posted" : "2009-01-28 08:42:24",
        "description" : "",
        "distance" : 43.100000000000001,
        "distance_units" : "miles",
        "end_date" : "",
        "end_time" : -1,
        "geocoding_ambiguous" : 0,
        "geocoding_precision" : "address",
        "id" : 1673283,
        "latitude" : 37.762,
        "longitude" : -122.435,
        "metro_id" : "",
        "name" : "Vagina Monologues",
        "num_future_events" : 0,
        "personal" : 0,
        "photo_url" : "",
        "selfpromotion" : 0,
        "start_date" : "2009-04-16",
        "start_date_last_rendition" : "Apr 16, 2009",
        "start_time" : "19:30:00",
        "ticket_free" : 0,
        "ticket_price" : "",
        "ticket_url" : "http://www.ticketsnow.com/InventoryBrowse/TicketList.aspx?PID=772555",
        "url" : "http://www.ticketsnow.com/EventList/EventsList.aspx?EID=905",
        "user_id" : 4,
        "utc_end" : "2009-04-17 05:30:00 UTC",
        "utc_start" : "2009-04-17 02:30:00 UTC",
        "venue_address" : "429 Castro St",
        "venue_city" : "San Francisco",
        "venue_country_code" : "US",
        "venue_country_id" : 1000000,
        "venue_country_name" : "United States",
        "venue_id" : 282390,
        "venue_name" : "Castro Theater",
        "venue_state_code" : "CA",
        "venue_state_id" : 1000000,
        "venue_state_name" : "CA",
        "venue_zip" : 94114,
        "watchlist_count" : 0
      },
      ...
    ],
    "stat" : "ok",
    "version" : 1
  } 
}

*/

?>