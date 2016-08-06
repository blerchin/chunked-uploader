import React from 'react';
import ChunkedUploader from 'services/ChunkedUploader'
import shortid from 'shortid'
import cloudinary from 'cloudinary_js'
import {API_KEY} from '../../../secrets.js'

export default class Uploader extends React.Component {
  constructor(){
    super();
    this.state = {
      status: 'Not started',
      progress: '0'
    }
  }

  fileChanged(el) {
    const file = el.target.files[0];
    const uploader = new ChunkedUploader(file, {
      url: 'https://api.cloudinary.com/v1_1/he97djkap/upload',
      params: {
        'api_key':       API_KEY,
        'timestamp':     Date.now / 1000 | 0,
        'upload_preset': 'video_async',
        'public_id':       shortid.generate(),
      }
    })
    uploader.start().then(()=>{
      this.setState({status: 'success'})
    })
    /*
    uploader.on('error', (err)=>{
      this.setState({status: 'error: ' + err})
    })
    uploader.on('progress', (evt)=>{
      this.setState({progress: evt.progress});
    })
    */

  }

  render() {
    return (
      <div>
        <div className="status">
          {this.state.status}
        </div>
        <div className="progress">
          {this.state.progress}
        </div>
        <input name="uploadFile" type="file" accept="video/*"
          onChange={this.fileChanged.bind(this)}/>

      </div>
    )
  }

}
