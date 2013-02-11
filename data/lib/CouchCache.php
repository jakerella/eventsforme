<?php
class CouchCache {

  private $host;
  private $port;
  private $db;
  private $ch;

  const DEFAULT_TTL = 86400;

  public function CouchCache($db = "cache", $host = "localhost", $port = 5984) {
    $this->host = $host;
    $this->port = $port;
    $this->db = $db;
    $this->ch = curl_init();

    $allDBs = $this->send("GET", "/_all_dbs");
    
    if (!in_array($this->db, $allDBs)) {
      $this->send("PUT", "/".$this->db);
    }
  }

  public function getById($id) {
    $item = $this->send("GET", "/".$this->db."/".$id);
    if (($item->couchCacheTTL + $item->couchCacheTimestamp) < time()) {
      $this->deleteById($item);
      throw new NotFoundException("Item has expired", 408);
    }
    return $item;
  }

  public function getAll() {
    return $this->send("GET", "/".$this->db."/_all_docs");
  }

  public function create($id, $data, $ttl = null) {
    $data = $this->prepareDocumentData($id, $data, $ttl);
    return $this->send("PUT", "/".$this->db."/".$id, $data);
  }

  public function update($id, $data) {
    $item = $this->getById($id);
    $data = $this->prepareDocumentData($id, $data, $item->couchCacheTTL);
    return $this->send("PUT", "/".$this->db."/".$id."?_rev=".$item->_rev, $data);
  }

  public function deleteById($idOrItem) {
    if (is_string($idOrItem)) {
      $id = $idOrItem;
      $rev = $this->getById($idOrItem)->_rev;
    } else if (is_object($idOrItem) && isset($idOrItem->_rev)) {
      $id = $idOrItem->_id;
      $rev = $idOrItem->_rev;
    } else if (is_array($idOrItem) && isset($idOrItem['_rev'])) {
      $id = $idOrItem['_id'];
      $rev = $idOrItem['_rev'];
    } else {
      throw new CouchException("Unable to get item revision");
    }
    return $this->send("DELETE", "/".$this->db."/".$id."?rev=".$rev);
  }

  public function deleteAll() {
    return $this->send("DELETE", "/".$this->db);
  }

  protected function prepareDocumentData($id, $data, $ttl = null) {
    if (is_string($data)) {
      $data = json_decode($data);
      if (!isset($data) || !$data) {
        throw new BadRequestException("Document data is not valid JSON");
      }
    }

    $ts = time();
    $ttl = ($ttl)?$ttl:self::DEFAULT_TTL;
    $ip = (isset($_SERVER['REMOTE_ADDR']))?$_SERVER['REMOTE_ADDR']:null;

    if (is_object($data)) {
      $data->_id = $id;
      $data->couchCacheTimestamp = $ts;
      $data->couchCacheTTL = $ttl;
      $data->couchCacheIP = $ip;
    } else if (is_array($data)) {
      $data['_id'] = $id;
      $data['couchCacheTimestamp'] = $ts;
      $data['couchCacheTTL'] = $ttl;
      $data['couchCacheIP'] = $ip;
    } else {
      throw new BadRequestException("Unrecognized data structure for document");
    }
    
    $data = json_encode($data);
    if (!isset($data) || !$data || !strlen($data)) {
      throw new BadRequestException("Document data cannot be encoded as JSON");
    }

    return $data;
  }

  protected function send($method, $url, $data = NULL) {
    $opts = array(
      CURLOPT_URL => "http://".$this->host.":".$this->port.$url,
      CURLOPT_PORT => $this->port,
      CURLOPT_FOLLOWLOCATION => true,
      CURLOPT_HEADER => true,
      CURLOPT_RETURNTRANSFER => true,
      CURLOPT_NOBODY => false,
      CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,
      CURLOPT_CUSTOMREQUEST => $method,
      CURLOPT_HTTPHEADER => array()
    );

    if ($data) {
      $opts[CURLOPT_POSTFIELDS] = $data;
      array_push($opts[CURLOPT_HTTPHEADER], "Content-Length: ".strlen($data));
      array_push($opts[CURLOPT_HTTPHEADER], "Content-Type: application/json");
    }
    if ($method == 'HEAD') {
      $opts[CURLOPT_NOBODY] = true;
    }

    curl_setopt_array($this->ch, $opts);

    $resp = curl_exec($this->ch);

    if (curl_errno($this->ch)) {
      throw new ConnectionException('cURL error #' . curl_errno($this->ch) . ': ' . curl_error($this->ch));

    } elseif($resp === false) {
      throw new ConnectionException('cURL returned false without providing an error.');

    } else {
      // successful call, process status code
      $status = curl_getinfo($this->ch, CURLINFO_HTTP_CODE);
      if ($status == 404) {
        throw new NotFoundException("Unable to find resource at {$url}");
      }

      list($headers, $body) = explode("\r\n\r\n", $resp);

      $json = json_decode($body);
      if (!isset($json) || !$json) {
        // See if we have a "100 Continue" bug issue
        if (preg_match("/100 Continue/", $resp)) {
          list($header100, $headers, $body) = explode("\r\n\r\n", $resp);
          $json = json_decode($body);
        }
        // Still broken?
        if (!isset($json) || !$json) {
          throw new CouchException("Invalid JSON returned from CouchDB: $resp");
        }
      }

      if(!empty($json->error)) {
        throw new CouchException("CouchDB error: {$json->error} ({$json->reason})", $status);
      }

      return $json;
    }
  }
}

class CouchException extends Exception {
  public function __construct($msg = "", $code = 500) {
    parent::__construct($msg, $code);
  }
}
class ConnectionException extends CouchException { }

if (!class_exists('NotFoundException')) {
  class NotFoundException extends Exception {
    public function __construct($msg = "", $code = 404) {
      parent::__construct($msg, $code);
    }
  }
}
if (!class_exists('BadRequestException')) {
  class BadRequestException extends Exception {
    public function __construct($msg = "", $code = 400) {
      parent::__construct($msg, $code);
    }
  }
}
?>