<?php

require_once('EventSource.php');

class EventbriteSource extends EventSource {

  const API_KEY = "UKGFOYQK7HNJIY22Z6";

  // must display: event title, event date, event time, event country, event city, event state, and any publicly published information about that event
  // must link to EB event

  public $name = 'Eventbrite';
  public $site = 'http://www.eventbrite.com';
  public $defaultCategory = 'Event';

  public function __contruct($logger = null) {
    parent::__construct($logger);
  }

  public function getGUIDPrefix() {
    return 'eb';
  }

  public function getEvents(array $params = null) {
    $params = array_merge(
      EventSource::$defaultParams,
      ($params)?$params:array()
    );

    $events = array();

    $url = "https://www.eventbrite.com/json/event_search?".
           "app_key=".self::API_KEY.
           "&latitude={$params['lat']}".
           "&longitude={$params['lng']}".
           "&within={$params['dist']}".
           "&max=".self::DEFAULT_PAGE_SIZE;

    if ($params['terms']) {
      $url .= "&keywords=".urlencode($params['terms']);
    }

    if (isset($params['time']) && is_numeric($params['time'])) {
      $url .= "&date=".date("Y-m-d")."%20".date("Y-m-d", (time() + (86400 * $params['time'])));
    } else {
      $url .= "&date=Future";
    }

    self::log("Sending request for Eventbrite events to {$url}");

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
        if (isset($respJson->error) && 
            isset($respJson->error->error_type) && 
            strlen($respJson->error->error_type) &&
            $respJson->error->error_type != "Not Found") { // ignore "Not Found", just means no results
          $this->handleBadResponse(552, $respJson->error->error_type.": ".$respJson->error->error_message);

        } else if (isset($respJson->events) && sizeof($respJson->events) > 1) { // "summary" is in ->events
          foreach ($respJson->events as $result) {
            if (isset($result->event)) {
              $event = $this->processEventResult($result->event);
              if ($event) {
                array_push($events, $event);
              }
            }
          }
        }
      } else {
        $this->handleBadResponse(551, "Invalid Eventbrite response and/or JSON");
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

    $url = "https://www.eventbrite.com/json/event_get?".
           "app_key=".self::API_KEY.
           "&id={$sId}";

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
      $respJson = json_decode(utf8_encode($response));

      if ($respJson) {
        // Handle results
        if (isset($respJson->error) && 
            isset($respJson->error->error_type) && 
            strlen($respJson->error->error_type) &&
            $respJson->error->error_type != "Not Found") { // ignore "Not Found", just means no results
          $this->handleBadResponse(552, $respJson->error->error_type.": ".$respJson->error->error_message);

        } else if (isset($respJson->event)) {
          $event = $this->processEventResult($respJson->event);
        }
      } else {
        $this->handleBadResponse(551, "Invalid Eventbrite response and/or JSON");
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
      $start = strtotime($result->start_date);
    } else {
      self::log($this->name.": no (or bad) start time (".$result->start_date.")");
      return null;
    }
    $end = null;
    if (isset($result->end_date) && strlen($result->end_date)) {
      $end = strtotime($result->end_date);
    }

    $lat = null;
    $lng = null;
    if (isset($result->venue) && isset($result->venue->latitude) && is_numeric($result->venue->latitude)) {
      $lat = $result->venue->latitude;
      $lng = $result->venue->longitude;
    }

    $loc = null;
    if (isset($result->venue) && isset($result->venue->name) && strlen($result->venue->name)) {
      $loc = $result->venue->name;
    }
    $addr = null;
    if (isset($result->venue) && isset($result->venue->address) && strlen($result->venue->address)) {
      $addr = $result->venue->address.", ".((isset($result->venue->address_2) && strlen($result->venue->address_2))?$result->venue->address_2.", ":'').$result->venue->city.", ".$result->venue->region;
    }

    $tickets = false;
    $tLink = null;
    $cost = null;
    if (isset($result->tickets) && sizeof($result->tickets)) {
      $cost = array();
      foreach ($result->tickets as $ticket) {
        if (isset($ticket->ticket)) {
          $ticket = $ticket->ticket; // srsly eventbrite... gah.

          if (isset($ticket->max) && $ticket->max) {
            // if there is a max number of tickets, then we assume they are required
            $tickets = true;
          }
          if (isset($ticket->price) && floatval($ticket->price) > 0) {
            // we assume that if there is a cost, tickets are required
            $tickets = true;
            $cost[] = $ticket->price;
          }
        }
      }
      if (sizeof($cost)) {
        $cost = implode(', ', $cost);
      } else {
        $cost = null;
      }
    }

    $event = array(
      'id' => $this->getGUID($result->id, $start),
      'title' => $result->title,
      'description' => preg_replace("/\\r\\n/", '', $result->description),
      'category' => ((isset($result->category) && strlen($result->category))?$result->category:$this->defaultCategory),
      'source' => $this->name,
      'link' => $result->url,
      'location' => $loc,
      'address' => $addr,
      'start' => date('Y-m-d H:i:s', $start),
      'end' => (($end)?date('Y-m-d H:i:s', $end):null),
      'tickets' => $tickets,
      'ticket_link' => (($tickets)?$result->url:null),
      'cost' => $cost,
      'lat' => $lat,
      'lng' => $lng
    );

    return $event;
  }

  private function handleBadResponse($status = 500, $response = "") {
    if ($status > 499) {
      self::log("Server error from ".$this->name." API: ".$response, PEAR_LOG_ERR);
    } else if ($status > 399) {
      self::log("Bad request to ".$this->name." API: ".$response, PEAR_LOG_WARNING);
    } else {
      self::log("Unknown error ($status) from ".$this->name." API: ".$response, PEAR_LOG_ERR);
    }
  }

}

/*
EXAMPLE RETURN DATA FROM EVENTBRITE API

{
  "events": [
    {
      "summary": {
        "total_items": 18,
        "first_event": 5170954464,
        "last_event": 4827427967,
        "filters": {
          "date": "2013-02-13 2013-02-20",
          "distance": "10.00M",
          "lat_lng": "35.1240498/-89.9858195"
        },
        "num_showing": 10
      }
    },
    {
      "event": {
        "box_header_text_color": "F94F5A",
        "link_color": "F94F5A",
        "box_background_color": "6EEFC8",
        "timezone": "America/Chicago",
        "box_border_color": "6EEFC8",
        "logo": "http://ebmedia.eventbrite.com/s3-s3/eventlogos/30613557/5170954464-1.jpg",
        "organizer": {
          "url": "http://www.eventbrite.com/org/2152155365",
          "description": "[[[text (with \r\n chars)]]]",
          "long_description": "",
          "id": 2152155365,
          "name": "sew memphis"
        },
        "background_color": "6EEFC8",
        "id": 5170954464,
        "category": "seminars,other",
        "box_header_background_color": "E2E66A",
        "capacity": 6,
        "num_attendee_rows": 2,
        "title": "sewing for homeschoolers",
        "start_date": "2013-02-14 13:00:00",
        "status": "Live",
        "description": "[[[html string (with some unnecessary \r\n chars)]]]",
        "end_date": "2013-04-25 16:00:00",
        "tags": "homeschool, homeschool, memphis, sewing, beginners, midtown, sew memphis",
        "timezone_offset": "GMT-0600",
        "text_color": "F94F5A",
        "title_text_color": "",
        "tickets": [
          {
            "ticket": {
              "description": "",
              "end_date": "2013-02-14 12:30:00",
              "min": 0,
              "max": 0,
              "price": "127.59",
              "visible": "true",
              "start_date": "2013-01-08 13:00:00",
              "currency": "USD",
              "type": 0,
              "id": 16611324,
              "name": "sewing for homeschoolers"
            }
          }
        ],
        "distance": "0.14M",
        "created": "2013-01-07 11:09:03",
        "url": "http://sewingforhomeschoolers-SRCH.eventbrite.com",
        "box_text_color": "2EAB79",
        "privacy": "Public",
        "venue": {
          "city": "Memphis",
          "name": "sew memphis",
          "country": "United States",
          "region": "TN",
          "longitude": -89.987875,
          "postal_code": "38104",
          "address_2": "",
          "address": "688 south cox",
          "latitude": 35.12692,
          "country_code": "US",
          "id": 1851231,
          "Lat-Long": "35.12692 / -89.987875"
        },
        "modified": "2013-01-17 09:56:53",
        "logo_ssl": "https://ebmedia.eventbrite.com/s3-s3/eventlogos/30613557/5170954464-1.jpg",
        "repeats": "no"
      }
    },
    ...
  ]
}

*/

?>