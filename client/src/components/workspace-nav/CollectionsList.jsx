import React, { Component, PropTypes } from 'react';
import CollectionListItem from './CollectionListItem';

export default class CollectionsList extends Component {
  render() {
    const listItems = this.props.collections.map((collection) => (
        <li key={collection.id}>
          <CollectionListItem collection={collection}/>
        </li>
      )
    );
    return <ul>{listItems}</ul>;
  }
}

CollectionsList.propTypes = {
  collections: PropTypes.array.isRequired,
};
