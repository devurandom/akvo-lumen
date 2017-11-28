import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import SelectMenu from '../../common/SelectMenu';
import SelectInput from './SelectInput';
import ButtonRowInput from './ButtonRowInput';
import ToggleInput from './ToggleInput';
import ColorLabels from './ColorLabels';
import FilterMenu from './FilterMenu';
import { filterColumns } from '../../../utilities/utils';

require('./LayerConfigMenu.scss');

const sourceDataset = { 'data-test-id': 'source-dataset-select' };

const geopoint = { 'data-test-id': 'geopoint-select' };

const colorCoding = { 'data-test-id': 'color-coding-select' };

const getSelectMenuOptionsFromColumnList = columns => (columns == null ?
  [] : columns.map((column, index) => ({
    value: `${column.get('columnName')}`,
    index: index.toString(),
    title: `${column.get('title')}`,
    label: `${column.get('title')} (${column.get('type')})`,
    type: `${column.get('type')}`,
  })).toArray());

const TabMenu = ({ activeTab, tabs, onChangeTab }) => (
  <ul
    className="TabMenu"
  >
    {tabs.map((tab, index) =>
      <li
        key={index}
        className={`tab ${tab === activeTab ? 'active' : 'inactive'}`}
      >
        <button
          className="tabButton clickable"
          onClick={() => onChangeTab(tab)}
        >
          {tab}
        </button>
      </li>
      )}
  </ul>
);

TabMenu.propTypes = {
  activeTab: PropTypes.string.isRequired,
  tabs: PropTypes.array.isRequired,
  onChangeTab: PropTypes.func.isRequired,
};

export default class LayerConfigMenu extends Component {
  constructor() {
    super();
    this.state = {
      activeTab: 'data',
    };

    this.getTabContent = this.getTabContent.bind(this);
    this.handlePointColorColumnChange = this.handlePointColorColumnChange.bind(this);
    this.handleChangeLabelColor = this.handleChangeLabelColor.bind(this);
    this.handlePopupChange = this.handlePopupChange.bind(this);
  }

  getTabContent(columnOptions) {
    const { layer, layerIndex, onChangeMapLayer, disabled } = this.props;
    let tabContent;

    switch (this.state.activeTab) {
      case 'data':
        tabContent = (
          <div
            className="dataTab"
          >
            <div
              className="inputGroup"
            >
              <label
                htmlFor="xDatasetMenu"
              >Source dataset:</label>
              <SelectMenu
                disabled={disabled}
                name="datasetMenu"
                placeholder="Choose dataset..."
                value={layer.datasetId !== null ?
                layer.datasetId.toString() : null}
                options={this.props.datasetOptions}
                onChange={datasetId => onChangeMapLayer(this.props.layerIndex, { datasetId })}
                data-test-id="source-dataset"
                inputProps={sourceDataset}
              />
            </div>
            <ButtonRowInput
              options={[{
                label: <FormattedMessage id="geo_location" />,
                value: 'geo-location',
              }, {
                label: <FormattedMessage id="geo_shape" />,
                value: 'geo-shape',
              }]}
              disabled
              selected="geo-location"
              label="Layer type"
              onChange={() => null}
              buttonSpacing="2rem"
            />
            {(layer.latitude != null || layer.longitude != null) &&
              <div>
                <div className="inputGroup">
                  <SelectInput
                    disabled={layer.datasetId === null || disabled}
                    placeholder="Select a latitude column"
                    labelText="Latitude column"
                    choice={layer.latitude != null ? layer.latitude.toString() : null}
                    name="latitudeInput"
                    options={filterColumns(columnOptions, 'number')}
                    onChange={value => onChangeMapLayer(layerIndex, {
                      latitude: value,
                    })}
                  />
                </div>
                <div className="inputGroup">
                  <SelectInput
                    disabled={layer.datasetId === null || disabled}
                    placeholder="Select a longitude column"
                    labelText="Longitude column"
                    choice={layer.longitude != null ? layer.longitude.toString() : null}
                    name="longitudeInput"
                    options={filterColumns(columnOptions, 'number')}
                    onChange={value => onChangeMapLayer(layerIndex, {
                      longitude: value,
                    })}
                  />
                </div>
                <hr />
              </div>
            }
            <div className="inputGroup">
              <SelectInput
                disabled={layer.datasetId === null || disabled}
                placeholder="Select a geopoint column"
                labelText="Geopoint column"
                choice={layer.geom != null ? layer.geom.toString() : null}
                name="geomInput"
                options={filterColumns(columnOptions, 'geopoint')}
                onChange={value => onChangeMapLayer(layerIndex, {
                  geom: value,
                  latitude: null,
                  longitude: null,
                })}
                inputProps={geopoint}
              />
            </div>
            <div className="inputGroup">
              <SelectInput
                disabled={
                  ((layer.latitude == null || layer.longitude == null) && layer.geom == null) ||
                  disabled
                }
                placeholder="Select a data column to color points by"
                labelText="Color coding column"
                choice={layer.pointColorColumn != null ?
                  layer.pointColorColumn.toString() : null}
                name="xGroupColumnMenu"
                options={filterColumns(columnOptions, ['text', 'number'])}
                clearable
                onChange={columnName =>
                  this.handlePointColorColumnChange(columnName,
                    columnOptions.find(option => option.value === columnName))}
                inputProps={colorCoding}
              />
            </div>
            <FilterMenu
              filters={layer.filters}
              hasDataset={layer.datasetId !== null}
              columnOptions={filterColumns(columnOptions, ['text', 'number', 'date'])}
              onChangeSpec={object => onChangeMapLayer(layerIndex, object)}
            />
          </div>
        );
        break;
      case 'legend':
        tabContent = (
          <div
            className="legendTab"
          >
            <ToggleInput
              disabled={disabled}
              className="inputGroup"
              checked={layer.legend.visible}
              label="Legend"
              onChange={(val) => {
                const legend = Object.assign({}, layer.legend);
                legend.visible = val;
                this.props.onChangeMapLayer(layerIndex, { legend });
              }}
            />
            <hr />
            <ButtonRowInput
              options={['top', 'right', 'bottom', 'left'].map(item => ({
                label: <FormattedMessage id={item} />,
                value: item,
              }))}
              label="Position"
              disabled={disabled}
              selected={layer.legend.position}
              onChange={(option) => {
                const legend = Object.assign({}, layer.legend);
                legend.position = option;
                this.props.onChangeMapLayer(layerIndex, { legend });
              }}
            />
            <hr
              className="notImplemented"
            />
            <ToggleInput
              className="inputGroup notImplemented"
              disabled
              checked={false}
              label="Counters"
              onChange={() => null}
            />
          </div>
        );
        break;
      case 'pop-up':
        tabContent = (
          <div
            className="popupTab"
          >
            <ToggleInput
              className="inputGroup"
              disabled
              checked
              label="Pop-up"
              onChange={() => null}
            />
            <hr />
            <div
              className="inputGroup"
            >
              {filterColumns(columnOptions, ['text', 'number', 'date']).map((option, index) =>
                <div
                  className="optionContainer"
                  key={index}
                >
                  <span
                    className="controlContainer"
                  >
                    <input
                      className="clickable"
                      type="checkbox"
                      checked={this.props.layer.popup.findIndex(entry =>
                        entry.column === option.value) > -1}
                      onChange={() => this.handlePopupChange(option.value)}
                      disabled={disabled}
                    />
                  </span>
                  <span
                    className="columnLabelContainer"
                    title={option.label}
                  >
                    {(option.label && option.label.length > 128) ?
                      `${option.label.substring(0, 128)}...`
                      :
                      option.label
                    }
                  </span>
                </div>
              )}
            </div>
          </div>
        );
        break;
      case 'theme':
        tabContent = (
          <div
            className="themeTab"
          >
            <h3>Marker</h3>
            <ButtonRowInput
              options={['circle', 'square', 'triangle'].map(item => ({
                label: <FormattedMessage id={item} />,
                value: item,
              }))}
              disabled
              selected="circle"
              label="Shape"
              onChange={() => null}
            />
            <ButtonRowInput
              options={['fill', 'outline'].map(item => ({
                label: <FormattedMessage id={item} />,
                value: item,
              }))}
              disabled
              selected="fill"
              label="Style"
              onChange={() => null}
              buttonSpacing="2rem"
            />
            <ButtonRowInput
              options={['1', '2', '3', '4', '5'].map(item => ({
                label: item,
                value: item,
              }))}
              disabled={disabled}
              selected={layer.pointSize ? layer.pointSize.toString() : null}
              label="Size"
              onChange={option => onChangeMapLayer(layerIndex, { pointSize: option })}
            />
            <hr />
            <h3>Color</h3>
            <ButtonRowInput
              options={['solid', 'gradient'].map(item => ({
                label: <FormattedMessage id={item} />,
                value: item,
              }))}
              disabled
              selected="solid"
              label="Color option"
              onChange={() => null}
              buttonSpacing="2rem"
            />
            {layer.pointColorColumn &&
              <div className="inputGroup">
                <label
                  htmlFor="colors"
                >
                  Colors ({columnOptions.find(obj => obj.value === layer.pointColorColumn).title})
                </label>
                <ColorLabels
                  disabled={disabled}
                  id="colors"
                  pointColorMapping={layer.pointColorMapping}
                  onChangeColor={(value, newColor) => this.handleChangeLabelColor(value, newColor)}
                />
              </div>
            }
          </div>
        );
        break;

      default:
        throw new Error(`Unknown tab ${this.state.activeTab}`);
    }

    return tabContent;
  }

  handlePointColorColumnChange(columnName = null, columnOption = null) {
    let legend;

    if (columnOption != null) {
      legend = Object.assign({}, this.props.layer.legend, { title: columnOption.title });
    } else {
      legend = Object.assign({}, this.props.layer.legend, { title: null });
    }

    this.props.onChangeMapLayer(this.props.layerIndex, {
      legend,
      pointColorColumn: columnName,
      pointColorMapping: [],
    });
  }

  handleChangeLabelColor(value, color) {
    const pointColorMapping = this.props.layer.pointColorMapping;

    this.props.onChangeMapLayer(this.props.layerIndex, {
      pointColorMapping: pointColorMapping.map((mapping) => {
        if (mapping.value === value) {
          return Object.assign({}, mapping, { color });
        }
        return mapping;
      }),
    });
  }

  handlePopupChange(columnName) {
    const popup = this.props.layer.popup.map(item => item);
    const index = popup.findIndex(item => item.column === columnName);
    const removeColumn = index > -1;

    if (removeColumn) {
      popup.splice(index, 1);
    } else {
      popup.push({ column: columnName });
    }
    this.props.onChangeMapLayer(this.props.layerIndex, { popup });
  }


  render() {
    const { layer, datasets } = this.props;
    const columns = datasets[layer.datasetId] ?
    datasets[layer.datasetId].get('columns') : null;
    const columnOptions = getSelectMenuOptionsFromColumnList(columns);

    return (
      <div
        className="LayerConfigMenu"
      >
        <div
          className="header"
        >
          <button
            className="clickable deselectLayer"
            onClick={this.props.onDeselectLayer}
          >
            ←
          </button>
          <span
            className="layerTitleContainer"
          >
            <h2>
              {layer.title}
            </h2>
          </span>
        </div>
        <TabMenu
          activeTab={this.state.activeTab}
          onChangeTab={tab => this.setState({ activeTab: tab })}
          tabs={['data', 'legend', 'pop-up', 'theme']}
        />
        <div className="tabContent">
          {this.getTabContent(columnOptions)}
        </div>
      </div>
    );
  }
}

LayerConfigMenu.propTypes = {
  layer: PropTypes.object.isRequired,
  datasets: PropTypes.object.isRequired,
  datasetOptions: PropTypes.array.isRequired,
  onChangeMapLayer: PropTypes.func.isRequired,
  onDeselectLayer: PropTypes.func.isRequired,
  layerIndex: PropTypes.number.isRequired,
  onSave: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
