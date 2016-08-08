import eventEmitter from 'event-emitter';
import request from 'superagent'

const DEFAULT_MAX_ATTEMPTS = 5;

class Chunk {
  constructor (blob, options) {
    eventEmitter(this);
    this.options = options;
    this.attempts = 0;
    this.maxAttempts = options.maxAttempts || DEFAULT_MAX_ATTEMPTS;
    this.succeeded = false;
    this.failed = false;
    this.stopped = true;
    this.blob = blob;
  }

  getHeaders () {
    const { startByte, endByte, totalBytes, uniqueId} = this.options;
    const isLast = (endByte - totalBytes) === -1;
    return {
      'Content-Range'     : `bytes ${startByte}-${endByte}/${isLast ? totalBytes : -1}`,
      'X-Unique-Upload-Id': uniqueId
    };

  }

  send () {
    const headers = this.getHeaders();
    const {method, url, params} = this.options;

    const formData = new FormData();
    formData.append('file', this.blob);
    for(let prop in params){
      formData.append(prop, params[prop]);
    }
    this.req = request[method.toLowerCase()](url)
      .set(headers)
      .send(formData)
      .on('progress', this.onProgress.bind(this))
      .end((err, res) => {
        if (err || res.status > 300) {
          this.onError(err || res);
        } else if (res.status > 100) {
          this.onSuccess(res);
        }
        this.onComplete(res);
      })
  }

  stop() {
    this.stopped = true;
    this.req && this.req.abort();
  }

  start() {
    this.stopped = false;
    this.send();
  }

  retry (res) {
    if (this.stopped) {
      return;
    }
    if (this.attempts++ < this.maxAttempts) {
      this.send();

    } else {
      this.onFailure(res);
    }
  }

  running(){
    return !this.stopped;
  }

  ready(){
    return !this.succeeded && this.stopped && !this.failed;
  }

  done(){
    return this.succeeded || this.failed;
  }

  getBytesLoaded(){
    const {endByte, startByte} = this.options
    if(this.succeeded){
      return endByte - startByte;
    }
    if(!this.progress){
      return 0;
    }
    const {loaded, total, lengthComputable} = this.progress;
    if(this.failed || this.stopped) {
      return 0;
    }
    if(lengthComputable){
      return loaded;
    } else {
      return endByte - startByte;
    }
  }

  onFailure (res){
    this.failed = true;
    this.stopped = true;
    this.emit('failure', res);
  }

  onProgress (evt) {
    this.progress = evt;
    this.emit('progress', evt);
  }

  onError (res) {
    this.emit('error', res);
    this.retry(res);
  }

  onSuccess (res) {
    this.succeeded = true;
    this.emit('success', res);
  }

  onComplete (res) {
    this.stopped = true;
    this.emit('complete', res);
  }
}

export default Chunk;
