import React from 'react';
import styled from '@emotion/styled';
import * as ReactRouter from 'react-router';
import {Location} from 'history';
import isEqual from 'lodash/isEqual';

import {Organization} from 'app/types';
import {getUtcToLocalDateObject} from 'app/utils/dates';
import {Client} from 'app/api';
import EventsChart from 'app/components/charts/eventsChart';
import {getParams} from 'app/components/organizations/globalSelectionHeader/getParams';
import {Panel} from 'app/components/panels';
import getDynamicText from 'app/utils/getDynamicText';
import EventView from 'app/utils/discover/eventView';
import {DisplayModes} from 'app/utils/discover/types';
import {decodeScalar} from 'app/utils/queryString';

import ChartFooter from './chartFooter';

type ResultsChartProps = {
  api: Client;
  router: ReactRouter.InjectedRouter;
  organization: Organization;
  eventView: EventView;
  location: Location;
};

class ResultsChart extends React.Component<ResultsChartProps> {
  shouldComponentUpdate(nextProps: ResultsChartProps) {
    const {eventView, ...restProps} = this.props;
    const {eventView: nextEventView, ...restNextProps} = nextProps;

    if (!eventView.isEqualTo(nextEventView)) {
      return true;
    }

    return !isEqual(restProps, restNextProps);
  }

  render() {
    const {api, eventView, location, organization, router} = this.props;

    const yAxisValue = eventView.getYAxis();

    const globalSelection = eventView.getGlobalSelection();
    const start = globalSelection.start
      ? getUtcToLocalDateObject(globalSelection.start)
      : null;

    const end = globalSelection.end ? getUtcToLocalDateObject(globalSelection.end) : null;

    const {utc} = getParams(location.query);
    const apiPayload = eventView.getEventsAPIPayload(location);
    const isTopEvents =
      eventView.display === DisplayModes.TOP5 ||
      eventView.display === DisplayModes.DAILYTOP5;

    const isDaily =
      eventView.display === DisplayModes.DAILYTOP5 ||
      eventView.display === DisplayModes.DAILY;

    return (
      <React.Fragment>
        {getDynamicText({
          value: (
            <EventsChart
              api={api}
              router={router}
              query={apiPayload.query}
              organization={organization}
              showLegend
              yAxis={yAxisValue}
              projects={globalSelection.project}
              environments={globalSelection.environment}
              start={start}
              end={end}
              period={globalSelection.statsPeriod}
              disablePrevious={eventView.display !== DisplayModes.PREVIOUS}
              disableReleases={eventView.display !== DisplayModes.RELEASES}
              field={isTopEvents ? apiPayload.field : undefined}
              showDaily={isDaily}
              topEvents={isTopEvents ? 5 : undefined}
              orderby={isTopEvents ? decodeScalar(apiPayload.sort) : undefined}
              utc={utc === 'true'}
            />
          ),
          fixed: 'events chart',
        })}
      </React.Fragment>
    );
  }
}

type ContainerProps = {
  api: Client;
  router: ReactRouter.InjectedRouter;
  eventView: EventView;
  location: Location;
  organization: Organization;
  confirmedQuery: boolean;

  // chart footer props
  total: number | null;
  onAxisChange: (value: string) => void;
  onDisplayChange: (value: string) => void;
};

class ResultsChartContainer extends React.Component<ContainerProps> {
  shouldComponentUpdate(nextProps: ContainerProps) {
    const {eventView, ...restProps} = this.props;
    const {eventView: nextEventView, ...restNextProps} = nextProps;

    if (
      !eventView.isEqualTo(nextEventView) ||
      this.props.confirmedQuery !== nextProps.confirmedQuery
    ) {
      return true;
    }

    return !isEqual(restProps, restNextProps);
  }

  render() {
    const {
      api,
      eventView,
      location,
      router,
      total,
      onAxisChange,
      onDisplayChange,
      organization,
    } = this.props;

    const yAxisValue = eventView.getYAxis();
    const hasQueryFeature = organization.features.includes('discover-query');
    const displayOptions = eventView.getDisplayOptions().filter(opt => {
      // top5 modes are only available with larger packages in saas.
      // We remove instead of disable here as showing tooltips in dropdown
      // menus is clunky.
      if (
        [DisplayModes.TOP5, DisplayModes.DAILYTOP5].includes(opt.value as DisplayModes) &&
        !hasQueryFeature
      ) {
        return false;
      }
      return true;
    });

    return (
      <StyledPanel>
        <ResultsChart
          api={api}
          eventView={eventView}
          location={location}
          organization={organization}
          router={router}
        />
        <ChartFooter
          total={total}
          yAxisValue={yAxisValue}
          yAxisOptions={eventView.getYAxisOptions()}
          onAxisChange={onAxisChange}
          displayOptions={displayOptions}
          displayMode={eventView.display || DisplayModes.DEFAULT}
          onDisplayChange={onDisplayChange}
        />
      </StyledPanel>
    );
  }
}

export default ResultsChartContainer;

export const StyledPanel = styled(Panel)`
  @media (min-width: ${p => p.theme.breakpoints[1]}) {
    margin: 0;
  }
`;
