import React, { Component, PropTypes } from 'react';

export default class LibrarySearch extends Component {

  handleClick() {
    const input = this.refs.search;
    this.props.onSearch(input.value.trim());
    input.value = '';
  }

  render() {
    return (
      <div className="LibrarySearch">
        <input ref="search" placeholder="Search"></input>
        <button onClick={evt => this.handleClick(evt)}>Search</button>
      </div>
    );
  }
}

LibrarySearch.propTypes = {
  onSearch: PropTypes.func.isRequired,
};