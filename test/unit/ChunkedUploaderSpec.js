import ChunkedUploader from '../../src/ChunkedUploader'
import sinon from 'sinon'

describe('ChunkedUploader', function(){
  describe('#constructor', function(){
    it('sets first argument as this.file', function(){
      let file = {};
      let c = new ChunkedUploader(file, {url: 'abc'});
      expect(c.file).to.equal(file);
    });

    it('sets default this.options to {method: POST}', function(){
      let c = new ChunkedUploader({}, {url: 'abc'});
      expect(c.options).to.have.property('method', 'POST');
    });

    it('sets default this.options to {uniquid: shortid}')

    it('sets default this.options to {maxChunkSize: 1MB}', function(){
      let c = new ChunkedUploader({}, {url: 'abc'});
      expect(c.options).to.have.property('maxChunkSize', 1 * 1024 * 1024);
    });

    it('overrides default options with props of 2nd argument', function(){
      const opt = {method: 'GET', maxChunkSize: 123, url: 'http://123.com'};
      let c = new ChunkedUploader({}, opt);
      expect(c.options).to.include(opt);
    })

    it('throws an error if options.url does not exist', function(){
      const opt = {method: 'GET', maxChunkSize: 123, url: null};
      expect( ChunkedUploader.bind(this, {}, opt) ).to.throw(Error);
    })

    it('throws an error if #browserSupported returns false', function(){
      const support = sinon.stub(ChunkedUploader.prototype, 'browserSupported', function(){
        return false;
      });
      const opt = {method: 'GET', maxChunkSize: 123, url: 'http://123.com'};
      expect(ChunkedUploader.bind(this, {}, opt)).to.throw(Error);
      support.restore();
    })

    it('sets this.chunks to an empty array', function(){
      const opt = {method: 'GET', maxChunkSize: 123, url: 'http://123.com'};
      let c = new ChunkedUploader({}, opt);

      expect(c.chunks).to.have.length(0);
    });
  });

  describe('#splitChunks', function(){
    it('calls file.slice this.file.size/maxChunkSize times', function(){
      //called one extra time to create a final 0-length chunk
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(),
        type: 'image/jpeg'
      };
      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});

      cu.splitChunks();
      expect(file.slice).to.have.callCount(4);
    });
    it('calls addChunk this.file.size/maxChunkSize + 1 times', function(){
      //called one extra time to create a final 0-length chunk
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(),
        type: 'image/jpeg'
      };
      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      sinon.stub(ChunkedUploader.prototype, 'addChunk');
      cu.splitChunks();
      expect(cu.addChunk).to.have.callCount(4);
      cu.addChunk.restore();
    });

    it('calls Blob.slice with contentType = file.type', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      cu.splitChunks();
      expect(file.slice).to.have.been.calledWith(sinon.match.any, sinon.match.any, 'image/jpeg');
    });

    it('creates a set of chunks whose blob size totals this.file.size', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(function(start, end){
          return {size: end - start};
        }),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      const chunkSizes = [];
      sinon.stub(cu, 'addChunk', function(blob){
        chunkSizes.push(blob.size);
      })
      cu.splitChunks();

      expect(chunkSizes.reduce((m,c)=> m += c )).to.equal(file.size)
    });

    it('creates a set of chunks ending in a chunk whose blob size is 0', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(function(start, end){
          return {size: end - start};
        }),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      const chunkSizes = [];
      sinon.stub(cu, 'addChunk', function(blob){
        chunkSizes.push(blob.size);
      })
      cu.splitChunks();

      expect(chunkSizes[chunkSizes.length-1]).to.equal(0);
    });

    it('returns an array of chunks with contiguous start- and endByte', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(function(start, end){
          return {start: start, end: end};
        }),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      const chunkPositions = [];
      sinon.stub(cu, 'addChunk', function(blob){
        chunkPositions.push(blob);
      })
      cu.splitChunks();

      for (let i=1; i<chunkPositions.length; i++) {
        expect(chunkPositions[i-1].end).to.equal(chunkPositions[i].start);
      }
    });
  });

  describe('#addChunk', function(){
    it('creates a chunk with passed-in Blob and adds to this.chunks', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(function(start, end){
          return {start: start, end: end};
        }),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      const blob = {size: 123};
      cu.addChunk(blob, 0, 123);
      expect(cu.chunks[0]).to.be.an('Object')
        .and.have.property('blob', blob);
    });
    it('returns the chunk', function(){
      const file = {
        size: 3 * 1024 * 1024,
        slice: sinon.spy(function(start, end){
          return {start: start, end: end};
        }),
        type: 'image/jpeg'
      };

      const cu = new ChunkedUploader(file, {url: 'http://dfkj'});
      const blob = {size: 123};
      const chunk = cu.addChunk(blob, 0, 123);
      expect(chunk).to.be.an('Object')
        .and.have.property('blob', blob);
      expect(chunk).to.have.deep.property('options.startByte')
      expect(chunk).to.have.deep.property('options.endByte')
      expect(chunk).to.have.deep.property('options.totalBytes')
    });

    describe('listeners', function(){
      let cu;
      let file;
      beforeEach(function(){
        file = {
          size: 3 * 1024 * 1024,
          slice: sinon.spy(function(start, end){
            return {start: start, end: end};
          }),
          type: 'image/jpeg'
        };
      })

      it('adds onChunkSuccess listener', function(){
        let cb = sinon.stub(ChunkedUploader.prototype, 'onChunkSuccess');
        cu = new ChunkedUploader(file, {url: 'http://dfkj'});
        let chunk = cu.addChunk({size: 123}, 0, 123);
        chunk.emit('success');
        expect(cb).to.have.been.called;
      });

      it('adds onChunkFailure listener', function(){
        let cb = sinon.stub(ChunkedUploader.prototype, 'onChunkFailure');
        cu = new ChunkedUploader(file, {url: 'http://dfkj'});
        let chunk = cu.addChunk({size: 123}, 0, 123);
        chunk.emit('failure');
        expect(cb).to.have.been.called;
      });
      it('adds onChunkError listener', function(){
        let cb = sinon.stub(ChunkedUploader.prototype, 'onChunkError');
        cu = new ChunkedUploader(file, {url: 'http://dfkj'});
        let chunk = cu.addChunk({size: 123}, 0, 123);
        chunk.emit('error');
        expect(cb).to.have.been.called;
      });
      it('adds onChunkProgress listener', function(){
        let cb = sinon.stub(ChunkedUploader.prototype, 'onChunkProgress');
        cu = new ChunkedUploader(file, {url: 'http://dfkj'});
        let chunk = cu.addChunk({size: 123}, 0, 123);
        chunk.emit('progress');
        expect(cb).to.have.been.called;
        cb.restore();
      });
      it('adds onChunkComplete listener', function(){
        let cb = sinon.stub(ChunkedUploader.prototype, 'onChunkComplete');
        cu = new ChunkedUploader(file, {url: 'http://dfkj'});
        let chunk = cu.addChunk({size: 123}, 0, 123);
        chunk.emit('complete');
        expect(cb).to.have.been.called;
        cb.restore()
      });
      })
  })

  describe('#getChunkOpts', function(){
    it('returns startByte prop', function(){
      let ret = ChunkedUploader.prototype.getChunkOpts.call({file:{size:456}}, 0, 123)
      ret.should.have.property('startByte', 0);
    })
    it('returns endByte prop', function(){
      let ret = ChunkedUploader.prototype.getChunkOpts.call({file:{size:456}}, 0, 123)
      ret.should.have.property('endByte', 123);
    })
    it('returns totalBytes prop', function(){
      let ret = ChunkedUploader.prototype.getChunkOpts.call({file:{size:456}}, 0, 123)
      ret.should.have.property('totalBytes', 456);
    })
  });

  describe('#start', function(){
    it('calls splitChunks');
    it('sets this.stopped = false', function(){
      var mock = {
        stopped: true,
        tick: sinon.spy()
      };
      ChunkedUploader.prototype.start.call(mock);
      expect(mock.stopped).to.be.false;
    })
    it('calls #tick', function(){
      var mock = {
        tick: sinon.spy()
      };
      ChunkedUploader.prototype.start.call(mock);
      expect(mock.tick).to.have.been.called;
    });
    it('returns a promise', function(){
      var mock = {
        tick: sinon.spy()
      };
      const res = ChunkedUploader.prototype.start.call(mock);
      expect(res).to.be.a.promise;
    })
  });

  describe('#stop', function(){
    it('sets this.stopped=true', function(){
      var mock = {
        stopped: false,
        tick: sinon.spy(),
        chunks: []
      };
      ChunkedUploader.prototype.stop.call(mock);
      expect(mock.stopped).to.be.true;
    })
    it('calls stop on all running uploads', function(){
      var mock = {chunks: [
        {
          stop: sinon.spy(),
          running: function(){ return true}
        },
        {
          stop: sinon.spy(),
          running: function(){ return false}
        },
        {
          stop: sinon.spy(),
          running: function(){ return true}
        },
      ]}
      ChunkedUploader.prototype.stop.call(mock)
      expect(mock.chunks[0].stop).to.have.been.called
      expect(mock.chunks[1].stop).not.to.have.been.called
      expect(mock.chunks[2].stop).to.have.been.called
    });
  });

  describe('#countRunning', function(){
    it('counts number of Chunks where #running() returns true', function(){
      let mock = {chunks: [
        {running: ()=>true},
        {running: ()=>true},
        {running: ()=>false},
        {running: ()=>true},
        {running: ()=>true},
        {running: ()=>true},
        {running: ()=>true},
      ]}
      let res = ChunkedUploader.prototype.countRunning.call(mock);
      expect(res).to.equal(6);
    });
  });

  describe('#countSucceeded', function(){
    it('counts number of Chunks where succeeded is true', function(){
      let mock = {
        chunks: [
          {succeeded: true},
          {succeeded: false},
          {succeeded: true},
          {succeeded: true}
        ]
      }
      let res = ChunkedUploader.prototype.countSucceeded.call(mock);
      expect(res).to.equal(3);
    })
  });

  describe('#succeeded', function(){
    it('returns true if all chunks succeeded', function(){
      let mock = {
        countSucceeded: ()=> 4,
        chunks: [
          {succeeded: true},
          {succeeded: true},
          {succeeded: true},
          {succeeded: true}
        ]
      }
      let res = ChunkedUploader.prototype.succeeded.call(mock);
      expect(res).to.be.true;
    })
    it('returns false if not all chunks succeeded', function(){
      let mock = {
        countSucceeded: ()=> 3,
        chunks: [
          {succeeded: true},
          {succeeded: false},
          {succeeded: true},
          {succeeded: true}
        ]
      }
      let res = ChunkedUploader.prototype.succeeded.call(mock);
      expect(res).to.be.false;
    })
  })

  describe('#tick', function(){
    describe('calls #start on Chunks where #ready returns true until maxSimultaneous uploads are running', function(){
      context('no uploads have started', function(){
        it('starts the first 3 chunks', function(){
          let mock = {
            options: {
              maxSimultaneous: 3,
            },
            chunks: [
              {ready: function(){ return true;}, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, start: sinon.spy(function(){this.running = true})},
            ],
            countRunning: function(){
              let count = 0;
              this.chunks.forEach(function(c){
                if(c.running) count++;
              })
              return count;
            }
          }
          ChunkedUploader.prototype.tick.apply(mock)
          expect(mock.chunks[0].start).to.have.been.calledOnce;
          expect(mock.chunks[1].start).to.have.been.calledOnce;
          expect(mock.chunks[2].start).to.have.been.calledOnce;
          expect(mock.chunks[3].start).not.to.have.been.called;
          expect(mock.chunks[4].start).not.to.have.been.called;
        });
      });
      context('3 uploads running and none succeeded of 5 total', function(){
        it('starts 0 chunks', function(){
          let mock = {
            options: {
              maxSimultaneous: 3,
            },
            chunks: [
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, running: false, start: sinon.spy(function(){this.running = true})},
            ],
            countRunning: function(){
              let count = 0;
              this.chunks.forEach(function(c){
                if(c.running) count++;
              })
              return count;
            }
          }
          ChunkedUploader.prototype.tick.apply(mock)
          expect(mock.chunks[0].start).not.to.have.been.called;
          expect(mock.chunks[1].start).not.to.have.been.called;
          expect(mock.chunks[2].start).not.to.have.been.called;
          expect(mock.chunks[3].start).not.to.have.been.called;
          expect(mock.chunks[4].start).not.to.have.been.called;
        });
      });
      context('2 uploads running and 1 succeeded of 5 total', function(){
        it('starts the 4th chunk', function(){
          let mock = {
            options: {
              maxSimultaneous: 3,
            },
            chunks: [
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return true;}, running: false, start: sinon.spy(function(){this.running = true})},
            ],
            countRunning: function(){
              let count = 0;
              this.chunks.forEach(function(c){
                if(c.running) count++;
              })
              return count;
            }
          }
          ChunkedUploader.prototype.tick.apply(mock)
          expect(mock.chunks[0].start).not.to.have.been.called;
          expect(mock.chunks[1].start).not.to.have.been.called;
          expect(mock.chunks[2].start).not.to.have.been.called;
          expect(mock.chunks[3].start).to.have.been.called;
          expect(mock.chunks[4].start).not.to.have.been.called;
        });
      })
      context('1 upload running and 4 uploads succeeded of 5 total', function(){
        it('starts 0 chunks', function(){
          let mock = {
            options: {
              maxSimultaneous: 3,
            },
            chunks: [
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: true, start: sinon.spy(function(){this.running = true})},
            ],
            countRunning: function(){
              let count = 0;
              this.chunks.forEach(function(c){
                if(c.running) count++;
              })
              return count;
            }
          }
          ChunkedUploader.prototype.tick.apply(mock)
          expect(mock.chunks[0].start).not.to.have.been.called;
          expect(mock.chunks[1].start).not.to.have.been.called;
          expect(mock.chunks[2].start).not.to.have.been.called;
          expect(mock.chunks[3].start).not.to.have.been.called;
          expect(mock.chunks[4].start).not.to.have.been.called;
        })
      })
      context('0 uploads running and 5 uploads succeeded of 5 total', function(){
        it('starts 0 chunks', function(){
          let mock = {
            options: {
              maxSimultaneous: 3,
            },
            chunks: [
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
              {ready: function(){ return false;}, running: false, start: sinon.spy(function(){this.running = true})},
            ],
            countRunning: function(){
              let count = 0;
              this.chunks.forEach(function(c){
                if(c.running) count++;
              })
              return count;
            },
            onSuccess: sinon.spy()
          }
          ChunkedUploader.prototype.tick.apply(mock)
          expect(mock.chunks[0].start).not.to.have.been.called;
          expect(mock.chunks[1].start).not.to.have.been.called;
          expect(mock.chunks[2].start).not.to.have.been.called;
          expect(mock.chunks[3].start).not.to.have.been.called;
          expect(mock.chunks[4].start).not.to.have.been.called;
        })
      })
    });
    it('waits for all uploads to complete before starting last one')
  });

  describe('#readyforChunk', function(){
    it('returns true if chunk is ready and is not last')
    it('returns false if chunk is not ready')
    it('returns false if chunk is ready and is last and all others are not done')
    it('returns true if chunk is ready and is last and all others are done')
  })

  describe('#onChunkComplete', function(){
    it('calls #tick', function(){
      let mock = {
        tick: sinon.spy()
      }
      ChunkedUploader.prototype.onChunkComplete.apply(mock);
      expect(mock.tick).to.have.been.called;
    });
  });

  describe('#onChunkProgress', function(){
    it('calls onProgress', function(){
      let mock = {
        onProgress: sinon.spy()
      }
      ChunkedUploader.prototype.onChunkProgress.apply(mock);
      expect(mock.onProgress).to.have.been.called;
    })
  })

  describe('#onProgress', function(){
    it('emits a progress event with #getProgress data')
  })

  describe('#getBytesLoaded', function(){
    it('sums the result of Chunk#getBytesLoaded for all chunks', function(){
      const mock = {chunks: [
        {getBytesLoaded: ()=> 0},
        {getBytesLoaded: ()=> 1},
        {getBytesLoaded: ()=> 2},
        {getBytesLoaded: ()=> 3},
      ]}
      const res = ChunkedUploader.prototype.getBytesLoaded.apply(mock)
      expect(res).to.equal(6)
    })
  })

  describe('#getProgress', function(){
    it('returns the result #getBytesLoaded / this.file.size as a decimal', function(){
      const mock = {
        getBytesLoaded: function(){
          return 6;
        },
        file: {
          size: 10
        }
      }
      const res = ChunkedUploader.prototype.getProgress.apply(mock);
      expect(res).to.equal(.6);
    })
  })

  describe('#onChunkFailure', function(){
    it('calls #onFailure')
    it('emits `chunkfailure`')
  })

  describe('#onFailure', function(){
    it('calls #stop')
    it('emits `failure`')
    it('rejects the promise (side effect of event)')
  })

  describe('#onChunkError', function(){
    it('emits a `chunkerror`')
  })

  describe('#onChunkSuccess', function(){
    it('emits a `chunksuccess`')
    context('last upload completed', function(){
      it('calls `onSuccess`')
    })
  })


  describe('#onSuccess', function(){
    it('emits `success`')
    it('resolves the promise (side effect of event)')
  })
});
