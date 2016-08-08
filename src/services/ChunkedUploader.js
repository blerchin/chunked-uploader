import Chunk from './Chunk'
import eventEmitter from 'event-emitter';
import shortid from 'shortid'

const DEFAULT_MAX_CHUNK_SIZE = 6 * 1024 * 1024;
const DEFAULT_MAX_SIMULTANEOUS = 3;

class ChunkedUploader {
  constructor (file, options) {
    eventEmitter(this);
    this.file = file;
    this.options = Object.assign({
      method         : 'POST',
      maxChunkSize   : DEFAULT_MAX_CHUNK_SIZE,
      maxSimultaneous: DEFAULT_MAX_SIMULTANEOUS,
      uniqueId       : shortid.generate()
    }, options);
    this.stopped = false;

    if (!this.options.url) {
      throw new Error('Please provide a url destination.');
    }

    if (!this.browserSupported()) {
      throw new Error(`Chunked upload is not supported in this browser.
        See https://developer.mozilla.org/en-US/docs/Web/API/Blob/slice`);
    }

    this.chunks = [];
  }

  browserSupported () {
    const slice = Blob.prototype.slice;
    return typeof slice === 'function';
  }

  splitChunks () {
    const size = this.options.maxChunkSize;
    let byte = 0;
    let start = 0;
    let end = 0;
    while (end < this.file.size) {
      start = end;
      end = start + size;

      if (end > this.file.size) {
        end = this.file.size;
      }

      const blob = this.file.slice(start, end, this.file.type);
      this.addChunk(blob, start, end-1);
    }
  }

  getChunkOpts (start, end) {
    return Object.assign({
      startByte: start,
      endByte: end,
      totalBytes: this.file.size
    }, this.options);
  }

  addChunk (blob, start, end) {
    const chunk = new Chunk(blob, this.getChunkOpts(start, end));
    chunk.on('success'  , this.onChunkSuccess.bind(this));
    chunk.on('error'    , this.onChunkError.bind(this));
    chunk.on('failure'  , this.onChunkFailure.bind(this));
    chunk.on('progress' , this.onChunkProgress.bind(this));
    chunk.on('complete' , this.onChunkComplete.bind(this));
    this.chunks.push(chunk);
    return chunk;
  }

  start() {
    this.splitChunks();
    this.stopped = false;
    this.tick();
    return new Promise((resolve, reject)=>{
      this.on('success', function(evt){
        resolve(evt);
      })
      this.on('failure', function(evt){
        reject(evt);
      })
    });
  }

  stop(){
    this.stopped = true;
    this.chunks.forEach((chunk)=>{
      if(chunk.running()){
        chunk.stop();
      }
    })
  }

  readyForChunk(cur){
    const chunk = this.chunks[cur];
    let ready = true;
    ready = ready && chunk.ready();
    if(cur !== 0 && !this.chunks[0].progress){
      ready = false;
    }
    if(this.chunks.length > 2 && (cur === this.chunks.length -1)){
      const lastFullChunkDone = this.chunks[this.chunks.length-2].succeeded;
      ready = ready && (this.countSucceeded() === this.chunks.length - 1) && lastFullChunkDone;
    }
    return ready;
  }

  tick(){
    const {maxSimultaneous} = this.options;
    if(this.stopped){
      return;
    }
    let running = this.countRunning();
    let cur = 0;
    while(running < maxSimultaneous && cur < this.chunks.length){
      let chunk = this.chunks[cur];
      if(this.readyForChunk(cur)){
        chunk.start();
      }
      running = this.countRunning();
      cur++;
    }
  }

  countRunning(){
    let count = 0;
    this.chunks.forEach(function(c){
      if(c.running()){
        count++;
      }
    })
    return count;
  }

  countSucceeded(){
    let count = 0;
    this.chunks.forEach(function(c){
      if(c.succeeded){
        count++;
      }
    })
    return count;
  }

  succeeded(){
    return this.countSucceeded() === this.chunks.length;
  }

  onChunkSuccess(evt){
    this.emit('chunksuccess', evt);
    if(this.succeeded()){
      this.onSuccess(evt);
      return;
    }
  }

  onChunkError(evt){
    this.emit('chunkerror', evt);
  }

  onChunkFailure(evt){
    this.emit('chunkfailure', evt);
    this.onFailure(evt);
  }

  onChunkComplete(){
    this.tick();
  }

  onChunkProgress(evt){
    this.onProgress(evt);
  }

  onProgress(){
    this.emit('progress', {
      loaded: this.getBytesLoaded(),
      total: this.file.size,
      progress: this.getProgress()
    })
    this.tick();
  }

  onSuccess(evt){
    this.emit('success', evt);
  }

  onFailure(evt){
    this.stop();
    this.emit('failure', evt)
  }

  getBytesLoaded(){
    let loaded = 0;
    this.chunks.forEach(function(c){
      let bytes = c.getBytesLoaded();
      if(bytes){
        loaded += bytes;
      }
    })
    return loaded;
  }

  getProgress(){
    return this.getBytesLoaded() / this.file.size;
  }
}

export default ChunkedUploader;
