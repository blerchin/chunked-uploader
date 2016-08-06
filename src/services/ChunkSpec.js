import Chunk from './Chunk';
import {expect} from 'chai'
import sinon from 'sinon'

```
When implementing chunked upload you must comply with the following restrictions:
- Header must contain X-Unique-Upload-Id which is the same (and unique) for all parts.
- Every part must contain Content-Range header which is applicable to the location of the chunk in the overall file (start-end/total).
- Last chunk must be last. meaning it must arrive the server after all other chunks returned.
- Each chunk must be larger than 5mb except the last one
```

describe('Chunk', function(){
  describe('#constructor', function () {
    it('sets this.attempts to 0', function(){
      let c = new Chunk({}, {});

      expect(c.attempts).to.equal(0);
    })

    it('sets this.stopped to true', function(){
      let c = new Chunk({}, {});

      expect(c.stopped).to.be.true;
    })

    it('sets this.maxAttempts to 5', function(){
      let c = new Chunk({}, {});

      expect(c.maxAttempts).to.equal(5);
    })

    it('sets succeeded to false', function(){
      let c = new Chunk({}, {});

      expect(c.succeeded).to.be.false;
    });

    it('sets succeeded to false', function(){
      let c = new Chunk({}, {});

      expect(c.failed).to.be.false;
    });

    it('sets this.options to second argument', function(){
      let opt = {};
      let c = new Chunk({}, opt);

      expect(c.options).to.equal(opt);
    })

    it('sets this.blob to first arg', function(){
      let opt = {};
      let blob = {size: 123};
      let c = new Chunk(blob, opt);

      expect(c.blob).to.equal(blob);
    })

    it('sets itself up as an event emitter', function(){
      let c = new Chunk({}, {});

      expect(c.emit).to.be.a('function');
      expect(c.on).to.be.a('function');
    });
  });

  describe('#getHeaders', function(){
    let c;
    beforeEach(function(){
      c = new Chunk({}, {startByte: 0, endByte: 1, totalBytes: 2});
    });

    it('returns an object with Content-Range', function(){
      expect(c.getHeaders()).to.have.property('Content-Range', '0-1/2');
    });
  });

  describe('#retry', function(){
    let send;
    let onFailure;

    beforeEach(function(){
      send = sinon.stub(Chunk.prototype, 'send');
      onFailure = sinon.stub(Chunk.prototype, 'onFailure');
    });
    afterEach(function(){
      send.restore();
      onFailure.restore();
    })

    context('attempts = 0', function(){
      it('calls #send', function(){
        const c = new Chunk({}, {});
        c.retry()
        expect(send).to.have.been.called;
      })
    })

    context('attempts = 4', function(){
      let c;
      beforeEach(function(){
        c = new Chunk({}, {});
        c.attempts = 4;
      });
      it('does not call #send', function(){
        c.retry();
        expect(send).not.to.have.been.called;
      })
      it('calls onFailure', function(){
        //failure is called only if the request has resulted in an error maxAttempts times
        expect(onFailure).to.have.been.called;
      })
    })

    context('this.stopped = true', function(){
      let c;
      beforeEach(function(){
        c = new Chunk({}, {});
      });
      it('does not call #send', function(){
        c.retry()
        expect(send).not.to.have.been.called;
      })
    })
  });

  describe('#onFailure', function(){
    let c;
    beforeEach(function(){
      c = new Chunk({}, {});
    })
    it('sets failed to true', function(){
      c.onFailure()
      expect(c.failed).to.be.true;
    })
    it('sets stopped to true', function(){
      c.onFailure()
      expect(c.stopped).to.be.true;
    })
    it('emits a failure event', function(){
      const fail = sinon.spy();
      c.on('failure', fail)
      c.onFailure();
      expect(fail).to.have.been.called;
    })
  })

  describe('#stop', function(){
    let c;
    beforeEach(function(){
      c = new Chunk({}, {});
    })
    it('sets this.stopped = true', function(){
      c.stop();
      expect(c.stopped).to.be.true;
    })
    it('calls this.req.abort if this.req exists', function(){
      c.req = {
        abort: sinon.spy()
      };
      c.stop();
      expect(c.req.abort).to.have.been.called;
    });
  });

  describe('#start', function(){
    let c;
    beforeEach(function(){
      c = new Chunk({}, {});
      sinon.stub(c, 'send');
    });
    it('sets this.stopped = false', function(){
      c.start();
      expect(c.stopped).to.be.false;
    });
    it('calls this.send', function(){
      c.start();
      expect(c.send).to.have.been.called;
    });
  });

  describe('#onProgress', function(){
    it('emits a progress event', function(){
      const progress = sinon.spy();
      const c = new Chunk({}, {});
      c.on('progress', progress);
      c.onProgress();
      expect(progress).to.have.been.called;
    })
    it('sets this.progress to ProgressEvent', function(){
      const c = new Chunk({}, {});
      const evt = {loaded: 1000, total: 4000, lengthComputable: true };
      c.onProgress(evt);
      expect(c.progress).to.equal(evt);
    })
  })

  describe('#getBytesLoaded', function(){
    it('if succeeded, returns options.totalBytes', function(){
      const mock = {
        succeeded: true,
        options: {
          totalBytes: 1000
        },
        progress: {
          lengthComputable: true,
          loaded: 900,
          total: 1000
        }
      }
      const res = Chunk.prototype.getBytesLoaded.apply(mock);
      expect(res).to.equal(1000);
    })
    it('if stopped, returns 0', function(){
      const mock = {
        stopped: true,
        progress: {
          lengthComputable: true,
          loaded: 500,
          total: 1000
        }
      }
      const res = Chunk.prototype.getBytesLoaded.apply(mock);
      expect(res).to.equal(0);
    })
    it('if failed, returns 0', function(){
      const mock = {
        failed: true,
        progress: {
          lengthComputable: true,
          loaded: 500,
          total: 1000
        }
      }
      const res = Chunk.prototype.getBytesLoaded.apply(mock);
      expect(res).to.equal(0);
    })
    it('if lengthComputable, returns percent completion', function(){
      const mock = {
        progress: {
          lengthComputable: true,
          loaded: 500,
          total: 1000
        }
      }
      const res = Chunk.prototype.getBytesLoaded.apply(mock);
      expect(res).to.equal(500);
    })
    it('if not lengthComputable, returns false', function(){
      const mock = {
        progress: {
          lengthComputable: false,
          loaded: 500,
          total: 1000
        }
      }
      const res = Chunk.prototype.getBytesLoaded.apply(mock);
      expect(res).to.equal(0);
    })
  })
});
