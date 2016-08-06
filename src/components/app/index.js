import React from 'react';
import './app.scss';
import Uploader from './uploader'

export default class App extends React.Component {
  static propTypes = {
    message : React.PropTypes.string.isRequired
  }

  constructor () {
    super();
  }

  render () {
    return (
      <div id="react-app">
        <h1>Chunked Uploader Test</h1>
        <Uploader />
      </div>
    );
  }
}
