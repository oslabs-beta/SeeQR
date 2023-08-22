import { EventEmitter } from 'events';
import { StyledEngineProvider, Theme, ThemeProvider } from '@mui/material/';
import CssBaseline from '@mui/material/CssBaseline';
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react';
import styled from 'styled-components';

import GlobalStyle from '../GlobalStyle';

import { DBType } from '../../backend/BE_types';
import { createQuery } from '../lib/queries';
import '../lib/style.css';
import {
  AppState,
  CreateNewQuery,
  DatabaseInfo,
  DbLists,
  QueryData,
  TableInfo,
} from '../types';

import {
  bgColor,
  defaultMargin,
  MuiTheme,
  sidebarShowButtonSize,
  sidebarWidth,
} from '../style-variables';

import Sidebar from './sidebar/Sidebar';

import CompareView from './views/CompareView/CompareView';
import DbView from './views/DbView/DbView';
import NewSchemaView from './views/NewSchemaView/NewSchemaView';
import QueryView from './views/QueryView/QueryView';
import QuickStartView from './views/QuickStartView';
import ThreeDView from './views/ThreeDView/ThreeDView';

import FeedbackModal from './modal/FeedbackModal';
import Spinner from './modal/Spinner';

import ConfigView from './Dialog/ConfigView';
import CreateDBDialog from './Dialog/CreateDBDialog';

import MenuContext from '../state_management/Contexts/MenuContext';
import menuReducer, {
  initialMenuState,
  submitAsyncToBackend,
} from '../state_management/Reducers/MenuReducers';
import invoke from '../lib/electronHelper';

import {
  appViewStateReducer,
  AppViewState,
} from '../state_management/Reducers/AppViewReducer';
import {
  AppViewContextState,
  AppViewContextDispatch,
} from '../state_management/Contexts/AppViewContext';

// Query Context and Reducer Imports
import {
  QueryContextState,
  QueryContextDispatch,
} from '../state_management/Contexts/QueryContext';
import {
  queryReducer,
  QueryState,
} from '../state_management/Reducers/QueryReducers';

declare module '@mui/material/styles/' {
  // eslint-disable-next-line @typescript-eslint/no-empty-interface
  interface DefaultTheme extends Theme {}
}

const emitter = new EventEmitter();
emitter.setMaxListeners(20);

const AppContainer = styled.div`
  display: grid;
  grid: 'sidebar main' 1fr / ${sidebarWidth} 1fr;
  padding: 0;
`;

// prettier-ignore lint//
const Main = styled.main<{ $fullwidth: boolean }>`
  grid-area: ${({ $fullwidth }) => ($fullwidth ? '1 / 1 / -1 / -1' : 'main')};
  background: ${bgColor};
  height: calc(100vh - (2 * ${defaultMargin}));
  max-width: ${({ $fullwidth }) =>
    $fullwidth ? '' : `calc(90vw - ${sidebarWidth} )`};
  padding: ${defaultMargin} ${sidebarShowButtonSize};
  margin: 0;
`;

function App() {
  /**
   * Reducers
   * useMemo prevents rerenders when state does not change. necessary because of useContext
   */
  const [menuState, menuDispatch] = useReducer(menuReducer, initialMenuState);
  const menuProvider = useMemo(
    () => ({ state: menuState, dispatch: menuDispatch }),
    [menuState],
  );

  // initializing the initial viewState object

  const initialAppViewState: AppViewState = {
    selectedView: 'dbView',
    sideBarIsHidden: false,
    showConfigDialog: false,
    showCreateDialog: false,
    PG_isConnected: false,
    MYSQL_isConnected: false,
  };

  const initialQueryState: QueryState = {
    queries: {},
    comparedQueries: {},
    workingQuery: undefined,
    newFilePath: '',
  };

  // creating the reducer to reduce all state changes to a single state object
  const [appViewState, appViewDispatch] = useReducer(
    appViewStateReducer,
    initialAppViewState,
  );

  console.log('THIS IS APP VIEW STATE', appViewState);

  const [queryState, queryDispatch] = useReducer(
    queryReducer,
    initialQueryState,
  );

  console.log('THIS IS QUERY STATE', queryState);

  // tablesReducer stuff here

  // ---
  // const [queries, setQueries] = useState<AppState['queries']>({});
  // const [comparedQueries, setComparedQueries] = useState<AppState['queries']>({});
  // const [workingQuery, setWorkingQuery] = useState<AppState['workingQuery']>();

  const [selectedDb, setSelectedDb] = useState<AppState['selectedDb']>('');
  // const [newFilePath, setFilePath] = useState<AppState['newFilePath']>('');
  const [ERView, setERView] = useState(true);

  const [DBInfo, setDBInfo] = useState<DatabaseInfo[]>();
  const [curDBType, setDBType] = useState<DBType>();

  const [dbTables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<TableInfo | undefined>();

  /**
   * New central source of async calls
   */
  const asyncCount = useRef(0);
  useEffect(() => {
    const { issued, resolved, asyncList } = menuState.loading;
    // Check that we are here because a new async was issued
    if (issued - resolved > asyncCount.current) {
      /**
       * FLOW: new async request
       * - async call submitted by component
       * - menuReducer adds request to tracked ongoing asyncs
       * - this useEffect triggers; something in the state contains necessary info to launch invoke
       *
       * NOTE: moved this logic to MenuReducers to keep logic localized and utilize
       *       dependency injection for testing purposes
       */
      submitAsyncToBackend(issued, asyncList, invoke, menuDispatch);
    }
    // keep track of ongoing asyncs in this useRef, even when arriving here as an async resolves
    asyncCount.current = issued - resolved;
  }, [menuState.loading]);

  // populate initial dblist
  useEffect(() => {
    const dbListFromBackend = (dbLists: DbLists) => {
      setDBInfo(dbLists.databaseList);
      setTables(dbLists.tableList);
      appViewDispatch({
        type: 'IS_PG_CONNECTED',
        payload: dbLists.databaseConnected.PG,
      });

      appViewDispatch({
        type: 'IS_MYSQL_CONNECTED',
        payload: dbLists.databaseConnected.MySQL,
      });

      // setSelectedTable(selectedTable || dbTables[0]);
    };
    menuDispatch({
      type: 'ASYNC_TRIGGER',
      loading: 'LOADING',
      payload: {
        event: 'return-db-list',
        callback: dbListFromBackend,
      },
    });
  }, []);

  // !this function is moved to queries.ts
  // /**
  //  * Hook to create new Query from data
  //  */
  // const createNewQuery: CreateNewQuery = (query: QueryData) => {
  //   try {
  //     // Only save query to saved queries if it contains all minimum information
  //     if (query.label && query.db && query.sqlString && query.group) {
  //       const newQueries = createQuery(queries, query);
  //       setQueries(newQueries);
  //     }
  //     // we must set working query to newly created query otherwise query view won't update
  //     setWorkingQuery(query);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // };

  // determine which view should be visible depending on selected view and
  // prerequisites for each view
  let shownView;
  switch (appViewState.selectedView) {
    case 'compareView':
      shownView = 'compareView';
      break;
    case 'dbView':
      if (!selectedDb) {
        shownView = 'quickStartView';
        break;
      }
      shownView = 'dbView';
      break;
    case 'queryView':
      if (!queryState.queries.selected && !selectedDb) {
        shownView = 'quickStartView';
        break;
      }
      shownView = 'queryView';
      break;
    case 'newSchemaView':
      shownView = 'newSchemaView';
      break;
    case 'threeDView':
      shownView = 'threeDView';
      break;
    case 'quickStartView':
    default:
      shownView = 'quickStartView';
  }

  return (
    // Styled Components must be injected last in order to override Material UI style: https://material-ui.com/guides/interoperability/#controlling-priority-3
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={MuiTheme}>
        <MenuContext.Provider value={menuProvider}>
          <Spinner />
          <AppContainer>
            <CssBaseline />
            <GlobalStyle />
            <QueryContextState.Provider value={queryState}>
              <QueryContextDispatch.Provider value={queryDispatch}>
                <AppViewContextState.Provider value={appViewState}>
                  <AppViewContextDispatch.Provider value={appViewDispatch}>
                    <Sidebar
                      {...{
                        selectedDb,
                        setSelectedDb,
                        setERView,
                        curDBType,
                        setDBType,
                        DBInfo,
                        queryDispatch,
                      }}
                    />
                  </AppViewContextDispatch.Provider>
                </AppViewContextState.Provider>

                <Main $fullwidth={appViewState.sideBarIsHidden}>
                  <CompareView
                    queries={queryState.comparedQueries}
                    show={shownView === 'compareView'}
                  />
                  <DbView
                    selectedDb={selectedDb}
                    show={shownView === 'dbView'}
                    setERView={setERView}
                    ERView={ERView}
                    curDBType={curDBType}
                    DBInfo={DBInfo}
                    dbTables={dbTables}
                    selectedTable={selectedTable}
                    setSelectedTable={setSelectedTable}
                  />
                  <QueryView
                    selectedDb={selectedDb}
                    setSelectedDb={setSelectedDb}
                    show={shownView === 'queryView'}
                    curDBType={curDBType}
                    setDBType={setDBType}
                    DBInfo={DBInfo}
                  />
                  <QuickStartView show={shownView === 'quickStartView'} />
                  <ThreeDView
                    show={shownView === 'threeDView'}
                    selectedDb={selectedDb}
                    dbTables={dbTables}
                    dbType={curDBType}
                  />
                  <NewSchemaView
                    query={queryState.workingQuery}
                    queryDispatch={queryDispatch}
                    selectedDb={selectedDb}
                    setSelectedDb={setSelectedDb}
                    show={shownView === 'newSchemaView'}
                    curDBType={curDBType}
                    dbTables={dbTables}
                    selectedTable={selectedTable}
                    setSelectedTable={setSelectedTable}
                  />

                  <ConfigView
                    show={appViewState.showConfigDialog}
                    onClose={() =>
                      appViewDispatch({ type: 'TOGGLE_CONFIG_DIALOG' })
                    }
                  />
                  <CreateDBDialog
                    show={appViewState.showCreateDialog}
                    DBInfo={DBInfo}
                    onClose={() =>
                      appViewDispatch({ type: 'TOGGLE_CREATE_DIALOG' })
                    }
                  />
                </Main>
                <FeedbackModal />
              </QueryContextDispatch.Provider>
            </QueryContextState.Provider>
          </AppContainer>
        </MenuContext.Provider>
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

export default App;
