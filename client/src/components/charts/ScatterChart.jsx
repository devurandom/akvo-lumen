import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Collection } from '@potion/layout'; // TODO: see if can optimize this
import { Circle, Svg, Group } from '@potion/element';
import { AxisBottom, AxisLeft } from '@vx/axis';
import get from 'lodash/get';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { Portal } from 'react-portal';
import merge from 'lodash/merge';
import { GridRows, GridColumns } from '@vx/grid';
import itsSet from 'its-set';

import { sortAlphabetically } from '../../utilities/utils';
import Legend from './Legend';
import ResponsiveWrapper from '../common/ResponsiveWrapper';
import ColorPicker from '../common/ColorPicker';
import Tooltip from './Tooltip';
import ChartLayout from './ChartLayout';

const getDatum = (data, datum) => data.filter(({ key }) => key === datum)[0];

export default class ScatterChart extends Component {

  static propTypes = {
    data: PropTypes.shape({
      data: PropTypes.arrayOf(
        PropTypes.shape({
          key: PropTypes.string,
          x: PropTypes.number,
          y: PropTypes.number,
          r: PropTypes.number,
        })
      ),
      metadata: PropTypes.object,
    }),
    colors: PropTypes.array.isRequired,
    colorMapping: PropTypes.object,
    onChangeVisualisationSpec: PropTypes.func.isRequired,
    width: PropTypes.number.isRequired,
    height: PropTypes.number.isRequired,
    legendPosition: PropTypes.oneOf(['right']),
    print: PropTypes.bool,
    interactive: PropTypes.bool,
    edit: PropTypes.bool,
    marginLeft: PropTypes.number,
    marginRight: PropTypes.number,
    marginTop: PropTypes.number,
    marginBottom: PropTypes.number,
    xAxisLabel: PropTypes.string,
    yAxisLabel: PropTypes.string,
    yAxisTicks: PropTypes.number,
    xAxisTicks: PropTypes.number,
    opacity: PropTypes.number,
    style: PropTypes.object,
    legendVisible: PropTypes.bool,
    grid: PropTypes.bool,
  }

  static defaultProps = {
    marginLeft: 0.2,
    marginRight: 0.1,
    marginTop: 0.1,
    marginBottom: 0.2,
    opacity: 0.9,
    legendVisible: false,
    edit: false,
    colorMapping: {},
    grid: true,
  }

  state = {
    isPickingColor: false,
  }

  getData() {
    const { data } = this.props;

    if (!get(data, 'series[0]')) return false;

    const values = data.series[0].data
      .map(({ value, ...rest }, i) => {
        const x = value;
        const y = data.series[1].data[i].value;
        return {
          ...rest,
          x: x ? Math.abs(x) : x,
          y: y ? Math.abs(y) : y,
        };
      });
    const series = merge({}, data.common, { ...data.series[0], data: values });

    return {
      ...series,
      data: series.data
        .sort((a, b) => sortAlphabetically(a, b, ({ key }) => key))
        .reduce((acc, datum) => (
          (itsSet(datum.x) && itsSet(datum.y)) ? acc.concat(datum) : acc
        ), []),
    };
  }

  getColor(key, index) {
    const { colorMapping, colors } = this.props;
    return colorMapping[key] || colors[index];
  }

  handleShowTooltip(event, tooltipItems) {
    const { clientX, clientY } = event;
    const bounds = this.wrap.getBoundingClientRect();

    const x = clientX - bounds.left;
    const y = clientY - bounds.top;

    const tooltipPosition = {};

    if (x < bounds.width / 2) tooltipPosition.left = x + 20;
    else tooltipPosition.right = (bounds.width - x) + 20;

    if (y < bounds.height / 2) tooltipPosition.top = y - 12;
    else tooltipPosition.bottom = bounds.height - y - 12;

    this.setState({
      tooltipVisible: true,
      tooltipItems,
      tooltipPosition,
    });
  }

  handleMouseEnterNode({ key, x, y, color }, event) {
    const { interactive, print, xAxisLabel, yAxisLabel } = this.props;
    if (!interactive || print) return;
    this.handleShowTooltip(event, [
      { key, color },
      { key: yAxisLabel || 'y', value: y },
      { key: xAxisLabel || 'x', value: x },
    ]);
    this.setState({ hoveredNode: key });
  }

  handleMouseEnterLegendNode({ key }) {
    const { interactive, print } = this.props;
    if (!interactive || print) return;
    this.setState({ hoveredNode: key });
  }

  handleMouseLeaveNode() {
    this.setState({ tooltipVisible: false });
  }

  handleClickNode({ key }, event) {
    const { interactive, print, edit } = this.props;
    if (!interactive || print) return;
    event.stopPropagation();
    this.setState({
      isPickingColor: edit ? key : null,
      hoveredNode: key,
    });
  }

  render() {
    const {
      width,
      height,
      colors,
      onChangeVisualisationSpec,
      marginLeft,
      marginRight,
      marginTop,
      marginBottom,
      opacity,
      style,
      legendVisible,
      xAxisLabel,
      yAxisLabel,
      xAxisTicks,
      yAxisTicks,
      grid,
    } = this.props;

    const { tooltipItems, tooltipVisible, tooltipPosition } = this.state;
    const series = this.getData();

    if (!series) return null;

    return (
      <ChartLayout
        style={style}
        width={width}
        height={height}
        legendVisible={legendVisible}
        onClick={() => {
          this.setState({ isPickingColor: null });
        }}
        legend={({ horizontal }) => (
          <Legend
            horizontal={!horizontal}
            title={get(this.props, 'data.metadata.bucketColumnTitle')}
            data={series.data.map(({ key }) => key)}
            colorMapping={
              series.data.reduce((acc, { key }, i) => ({
                ...acc,
                [key]: this.getColor(key, i),
              }), {})
            }
            activeItem={get(this.state, 'hoveredNode')}
            onClick={({ datum }) => (event) => {
              this.handleClickNode({ ...getDatum(series.data, datum) }, event);
            }}
            onMouseEnter={({ datum }) => () => {
              if (this.state.isPickingColor) return;
              this.handleMouseEnterLegendNode(getDatum(series.data, datum));
            }}
          />
        )}
        chart={
          <ResponsiveWrapper>{(dimensions) => {
            const availableHeight = dimensions.height * (1 - marginBottom - marginTop);
            const availableWidth = dimensions.width * (1 - marginLeft - marginRight);

            const xExtent = extent(series.data, ({ x }) => x);
            if (xExtent[0] > 0) xExtent[0] = 0;
            const xScale = scaleLinear()
              .domain(xExtent)
              .range([
                dimensions.width * marginLeft,
                dimensions.width * (1 - marginRight),
              ]);

            const yExtent = extent(series.data, ({ y }) => y);
            if (yExtent[0] > 0) yExtent[0] = 0;
            const yScale = scaleLinear()
              .domain(yExtent)
              .range([
                dimensions.height * (1 - marginBottom),
                dimensions.height * marginTop,
              ]);

            const radius = 5;

            return (
              <div
                style={{ position: 'relative' }}
                ref={(c) => {
                  this.wrap = c;
                }}
              >
                {tooltipVisible && (
                  <Tooltip
                    items={tooltipItems}
                    {...tooltipPosition}
                  />
                )}
                <Svg width={dimensions.width} height={dimensions.height}>

                  {grid && (
                    <Group>
                      <GridRows
                        scale={yScale}
                        width={availableWidth}
                        height={availableHeight}
                        left={dimensions.width * marginLeft}
                        numTicks={yAxisTicks}
                      />
                      <GridColumns
                        scale={xScale}
                        width={availableWidth}
                        height={availableHeight}
                        top={dimensions.height * marginTop}
                        numTicks={xAxisTicks}
                      />
                    </Group>
                  )}

                  <Collection data={series.data}>{nodes => (
                    <Group>
                      {nodes.map(({ key, x, y, r, category }, i) => {
                        const color = this.getColor(key, i);
                        const normalizedX = xScale(x);
                        const normalizedY = yScale(y);
                        const colorpickerPlacementY = normalizedY < dimensions.height / 2 ? 'bottom' : 'top';
                        const colorpickerPlacementX = normalizedX < dimensions.width / 2 ? 'right' : 'left';
                        const colorpickerPlacement = `${colorpickerPlacementY}-${colorpickerPlacementX}`;

                        return (
                          <Group key={key}>
                            {(this.state.isPickingColor === key) && (
                              <Portal node={this.wrap}>
                                <ColorPicker
                                  left={normalizedX - 2}
                                  top={
                                    colorpickerPlacementY === 'top' ?
                                      normalizedY - radius :
                                      normalizedY + radius
                                    }
                                  placement={colorpickerPlacement}
                                  title={`Pick color: ${key}`}
                                  color={color}
                                  onChange={({ hex }) => {
                                    onChangeVisualisationSpec({
                                      colors: { ...colors, [this.state.isPickingColor]: hex },
                                    });
                                    this.setState({ isPickingColor: null });
                                  }}
                                />
                              </Portal>
                            )}
                            <Circle
                              key={i}
                              cx={normalizedX}
                              cy={normalizedY}
                              r={radius}
                              fill={color}
                              stroke={color}
                              strokeWidth={2}
                              fillOpacity={opacity}
                              onClick={(event) => {
                                this.handleClickNode({ key }, event);
                              }}
                              onMouseEnter={(event) => {
                                this.handleMouseEnterNode({ key, x, y, color }, event);
                              }}
                              onMouseMove={(event) => {
                                this.handleMouseEnterNode({ key, x, y, color }, event);
                              }}
                              onMouseLeave={() => {
                                this.handleMouseLeaveNode();
                              }}
                            />
                          </Group>
                        );
                      })}
                    </Group>
                  )}</Collection>

                  <AxisLeft
                    scale={yScale}
                    left={dimensions.width * marginLeft}
                    label={yAxisLabel || ''}
                    stroke={'#1b1a1e'}
                    tickTextFill={'#1b1a1e'}
                    numTicks={yAxisTicks}
                  />

                  <AxisBottom
                    scale={xScale}
                    top={dimensions.height * (1 - marginBottom)}
                    label={xAxisLabel || ''}
                    stroke={'#1b1a1e'}
                    tickTextFill={'#1b1a1e'}
                    numTicks={xAxisTicks}
                  />

                </Svg>
              </div>
            );
          }}</ResponsiveWrapper>
        }
      />
    );
  }

}
