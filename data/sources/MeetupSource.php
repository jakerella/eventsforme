<?php

require_once('EventSource.php');

class MeetupSource extends EventSource {

  const API_KEY = "784c1c303d407a4f674272f2ee2e24";

  public $name = 'Meetup';
  public $site = 'http://www.meetup.com';
  public $defaultCategory = 'Meetup';

  public function __contruct($logger = null) {
    parent::__construct($logger);
  }

  public function getGUIDPrefix() {
    return 'mu';
  }

  public function getEvents(array $params = null) {
    $params = array_merge(
      EventSource::$defaultParams,
      ($params)?$params:array()
    );

    $events = array();

    $url = "https://api.meetup.com/2/open_events?".
           "key=".self::API_KEY.
           "&lat={$params['lat']}".
           "&lon={$params['lng']}".
           "&radius={$params['dist']}".
           "&status=upcoming".
           "&page=".self::DEFAULT_PAGE_SIZE.
           "&sign=true";

    if ($params['terms']) {
      $url .= "&text=".urlencode($params['terms'])."&and_text=true";
    }

    if (isset($params['time'])) {
      $url .= "&time=,".$params['time']."d";
    }

    self::log("Sending request for Meetup events to {$url}");

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

      if ($respJson) {
        // Handle results
        if (isset($respJson->results) && sizeof($respJson->results) > 0) {
          foreach ($respJson->results as $result) {
            $event = $this->processEventResult($result);
            if ($event) {
              array_push($events, $event);
            }
          }
        }
      } else {
        $this->handleBadResponse(551, "Invalid Meetup response and/or JSON");
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

    $url = "https://api.meetup.com/2/event/{$sId}?".
           "key=".self::API_KEY.
           "&page=1".
           "&sign=true";

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
      $result = json_decode(utf8_encode($response));

      if ($result) {
        $event = $this->processEventResult($result);
      } else {
        $this->handleBadResponse(551, "Invalid Meetup response and/or JSON");
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

    if (isset($result->time) && is_numeric($result->time)) {
      $start = round($result->time / 1000);
    } else {
      self::log($this->name.": no (or bad) start time (".$result->time.")");
      return null;
    }
    $end = null;
    if (isset($result->duration) && is_numeric($result->duration)) {
      $end = round($start + ($result->duration / 1000));
    }

    $lat = null;
    $lng = null;
    if (isset($result->venue) && isset($result->venue->lat) && is_numeric($result->venue->lat)) {
      $lat = $result->venue->lat;
      $lng = $result->venue->lon;
    }

    $loc = null;
    if (isset($result->venue) && isset($result->venue->name) && strlen($result->venue->name)) {
      $loc = $result->venue->name;
    }
    $addr = null;
    if (isset($result->venue) && isset($result->venue->address_1) && strlen($result->venue->address_1)) {
      $addr = $result->venue->address_1.", ".$result->venue->city.", ".$result->venue->state;
    }

    $cat = $this->defaultCategory;
    if (isset($result->group) && isset($result->group->category)) {
      $cat = $result->group->category->name;
    }

    $tickets = false;
    $tLink = null;
    $cost = null;
    if (isset($result->fee) && isset($result->fee->amount) && $result->fee->amount > 0) {
      $cost = floatval($result->fee->amount);
      if (isset($result->fee->required) && $result->fee->required == 1) {
        $tickets = true;
        $tLink = $result->event_url;
      }
    }

    $event = array(
      'id' => $this->getGUID($result->id, $start),
      'title' => $result->name,
      'description' => $result->description,
      'category' => $cat,
      'source' => $this->name,
      'link' => $result->event_url,
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
    } else if ($status == 401) {
      self::log("Bad API key for ".$this->name.": ".self::API_KEY, PEAR_LOG_ERR);
    } else if ($status == 400) {
      self::log("Bad request to ".$this->name." API: ".$response, PEAR_LOG_WARNING);
    } else {
      self::log("Unknown error ($status) from ".$this->name." API: ".$response, PEAR_LOG_ERR);
    }
  }

}

/*
EXAMPLE RETURN DATA FROM MEETUP API
{
  "results": [
    {
      "rsvp_limit": 10,
      "status": "upcoming",
      "visibility": "public",
      "maybe_rsvp_count": 0,
      "venue": {
        "id": 11056242,
        "zip": "37208",
        "lon": -86.79261,
        "repinned": false,
        "name": "Rolf and Daughters",
        "state": "TN",
        "address_1": "700 Taylor St",
        "lat": 36.177437,
        "city": "Nashville",
        "country": "us"
      },
      "id": "98671662",
      "utc_offset": -21600000,
      "distance": 1.4671881198883057,
      "time": 1360367100000,
      "duration": 3600000,
      "waitlist_count": 12,
      "updated": 1359944996000,
      "yes_rsvp_count": 10,
      "created": 1357700791000,
      "event_url": "http://www.meetup.com/NESNashville/events/98671662/",
      "description": "<p>Rolf and Daughters in Germantown has a global menu with plenty of southern offerings!!</p><p>Screen it at: <a href=\"http://rolfanddaughters.com\" class=\"linkified\">http://rolfanddaughters.com</a></p><p>Special thank you to <span style=\"text-decoration : underline\"><strong>Zolia</strong></span> for this suggestion!!</p><p> </p>",
      "how_to_find_us": "Come on in!!!",
      "name": "Feb. Friday-8th at Rolf and Daughters",
      "headcount": 0,
      "group": {
        "id": 3321682,
        "group_lat": 36.16999816894531,
        "name": "Never Eat Solo! Official: Eating with Friends in Nashville",
        "group_lon": -86.77999877929688,
        "join_mode": "open",
        "urlname": "NESNashville",
        "who": "Food Connoisseurs"
      }
    },
    ...
  ],
  "meta": {
    "lon": -86.774375,
    "count": 50,
    "signed_url": "http://api.meetup.com/2/open_events?status=upcoming&_=1360360786715&radius=25.0&and_text=False&limited_events=False&desc=False&offset=0&callback=jQuery17104783838011790067_1360360673541&format=json&lat=36.162184&page=50&lon=-86.774375&sig_id=10483030&sig=6c77536da58a07b8b3f6278ae78f2799d17552c9",
    "link": "https://api.meetup.com/2/open_events",
    "next": "https://api.meetup.com/2/open_events?key=784c1c303d407a4f674272f2ee2e24&status=upcoming&_=1360360786715&radius=25.0&and_text=False&limited_events=False&format=json&lat=36.162184&page=50&desc=False&callback=jQuery17104783838011790067_1360360673541&offset=1&sign=true&lon=-86.774375",
    "total_count": 427,
    "url": "https://api.meetup.com/2/open_events?key=784c1c303d407a4f674272f2ee2e24&status=upcoming&_=1360360786715&radius=25.0&and_text=False&limited_events=False&format=json&lat=36.162184&page=50&desc=False&callback=jQuery17104783838011790067_1360360673541&offset=0&sign=true&lon=-86.774375",
    "id": "",
    "title": "Meetup Open Events v2",
    "updated": 1360360786761,
    "description": "Searches for recent and upcoming public events hosted by Meetup groups. Its search window  is the past one month through the next three months, and is subject to change. Open Events is optimized to search for current events by location, category, topic, or text, and only lists meetups that have **3 or more RSVPS**. The number or results returned with each request is not guaranteed to be the same as the page size due to secondary filtering. If you're looking for a particular event or events within a particular group, use the standard [Events](/meetup_api/docs/2/events/) method.",
    "method": "OpenEvents",
    "lat": 36.162184
  }
}

*/

?>