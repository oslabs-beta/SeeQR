import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { ipcRenderer } from 'electron';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { Box, Tab, Tabs, IconButton, InputAdornment } from '@mui/material';
import {
  ButtonContainer,
  StyledButton,
  StyledTextField,
} from '../../style-variables';
import { asyncTrigger } from '../../state_management/Slices/MenuSlice';
import { DocConfigFile } from '../../../shared/types/types';
import { RootState } from '../../state_management/store';

interface BasicTabsProps {
  onClose: () => void;
}
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface inputFieldsType {
  pg: JSX.Element[];
  mysql: JSX.Element[];
  rds_mysql: JSX.Element[];
  rds_pg: JSX.Element[];
  sqlite: JSX.Element[];
}
// Material UI TabPanel component
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: '.25rem',
            alignItems: 'center',
            pt: 2,
          }}
        >
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

export default function BasicTabs({ onClose }: BasicTabsProps) {
  // context for async calls
  const dispatch = useDispatch();

  // useState hooks for database connection information
  const [mysqlCreds, setmysql] = useState({});
  const [pgCreds, setpg] = useState({});
  const [rds_mysqlCreds, setrds_mysql] = useState({});
  const [rds_pgCreds, setrds_pg] = useState({});
  const [sqliteCreds, setSqlite] = useState({}); // added sqlite
  // Toggle TabPanel display
  const [value, setValue] = useState(0);
  // Toggle show password in input fields
  const [showpass, setShowpass] = useState({
    pg: false,
    mysql: false,
    rds_mysql: false,
    rds_pg: false,
    sqlite: false,
  });
  // Storing input StyledTextFields to render in state
  const [inputFieldsToRender, setInputFieldsToRender] =
    useState<inputFieldsType>({
      pg: [],
      mysql: [],
      rds_mysql: [],
      rds_pg: [],
      sqlite: [], // added sqlite
    });

  const designateFile = (setPath) => {
    const options = {
      title: 'Select SQLite File',
      defaultPath: '',
      buttonLabel: 'Select File',
      filters: [{ name: 'db', extensions: ['db'] }],
    };
    const setPathCallback = (val) => setPath({ path: val });
    dispatch(
      asyncTrigger({
        loading: 'LOADING',
        options: {
          event: 'showOpenDialog',
          payload: options,
          callback: setPathCallback,
        },
      }),
    );
  };

  // Function to make StyledTextFields and store them in inputFieldsToRender state
  const inputFieldMaker = (
    dbTypeFromState: object,
    setDbTypeFromState: React.Dispatch<React.SetStateAction<object>>,
    dbString: string,
  ) => {
    // Push all StyledTextFields into this temporary array
    const arrayToRender: JSX.Element[] = [];
    if (dbString === 'sqlite') {
      arrayToRender.push(
        <StyledButton
          variant="contained"
          color="primary"
          onClick={() => designateFile(setDbTypeFromState)}
        >
          Set db file location
        </StyledButton>,
      );
    } else {
      // Get key value pairs from passed in database connection info from state
      Object.entries(dbTypeFromState).forEach((entry) => {
        // entry looks like [user: 'username'] or [password: 'password]
        const [dbEntryKey, dbEntryValue] = entry;
        // If we are rendering a password StyledTextField, then add special props
        let styledTextFieldProps;
        if (dbEntryKey === 'password') {
          styledTextFieldProps = {
            type: showpass[dbString] ? 'text' : 'password',
            InputProps: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={() =>
                      setShowpass({
                        ...showpass,
                        [dbString]: !showpass[dbString],
                      })
                    }
                    size="large"
                  >
                    {showpass[dbString] ? <Visibility /> : <VisibilityOff />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          };
        }
        // Push StyledTextField to temporary render array for current key in database connection object from state
        arrayToRender.push(
          <StyledTextField
            required
            id="filled-basic"
            label={`${dbString.toUpperCase()} ${dbEntryKey.toUpperCase()}`}
            size="small"
            variant="outlined"
            key={`${dbString} ${dbEntryKey}`}
            onChange={(e) => {
              setDbTypeFromState({
                ...dbTypeFromState,
                [dbEntryKey]: e.target.value,
              });
            }}
            defaultValue={dbEntryValue}
            InputProps={{
              style: { color: '#575151' },
            }}
            // Spread special password props if they exist
            {...styledTextFieldProps}
          />,
        );
      });
    }
    // Update state for our current database type passing in our temporary array of StyledTextField components
    // prevState is used to ensure that the multiple calls from useEffect force react to update state every call and not batch updates
    setInputFieldsToRender((prevState) => ({
      ...prevState,
      [dbString]: arrayToRender,
    }));
  };

  useEffect(() => {
    // Listen to backend for updates to list of available databases
    const configFromBackend = (config: DocConfigFile) => {
      // Set state based on parsed config.json object received from backend
      setmysql({ ...config.mysql_options });
      setpg({ ...config.pg_options });
      setrds_mysql({ ...config.rds_mysql_options });
      setrds_pg({ ...config.rds_pg_options });
      setSqlite({ ...config.sqlite_options }); // added sqlite
    };

    dispatch(
      asyncTrigger({
        loading: 'LOADING',
        options: { event: 'get-config', callback: configFromBackend },
      }),
    );
  }, [dispatch]);

  // Invoke functions to generate input StyledTextFields components -- passing in state, setstate hook, and database name string.
  // have it subscribed to changes in db connection info and/or show password button. Separate hooks to not rerender all fields each time
  useEffect(() => {
    inputFieldMaker(rds_pgCreds, setrds_pg, 'rds_pg');
  }, [rds_pgCreds, showpass.rds_pg]);

  useEffect(() => {
    inputFieldMaker(pgCreds, setpg, 'pg');
  }, [pgCreds, showpass.pg]);

  useEffect(() => {
    inputFieldMaker(mysqlCreds, setmysql, 'mysql');
  }, [mysqlCreds, showpass.mysql]);

  useEffect(() => {
    inputFieldMaker(rds_mysqlCreds, setrds_mysql, 'rds_mysql');
  }, [rds_mysqlCreds, showpass.rds_mysql]);

  useEffect(() => {
    inputFieldMaker(sqliteCreds, setSqlite, 'sqlite'); // added sqlite
  }, []);

  const handleClose = (): void => {
    onClose();
  };

  const handleSubmit = (): void => {
    // Pass database connection values from state to backend
    dispatch(
      asyncTrigger({
        loading: 'LOADING',
        options: {
          event: 'set-config',
          payload: {
            mysql_options: { ...mysqlCreds },
            pg_options: { ...pgCreds },
            rds_mysql_options: { ...rds_mysqlCreds },
            rds_pg_options: { ...rds_pgCreds },
            sqlite_options: { ...sqliteCreds },
          },
          callback: handleClose,
        },
      }),
    );
  };

  // Function to handle onChange -- when tab panels change
  const handleChange = (e: React.SyntheticEvent, newValue: number) => {
    // On panel change reset all passwords to hidden
    setShowpass({
      mysql: false,
      pg: false,
      rds_mysql: false,
      rds_pg: false,
      sqlite: false,
    });
    // Change which tab panel is hidden/shown
    setValue(newValue);
  };

  // Array of all db names for login tabs
  const dbNames = ['MySql', 'Postgres', 'RDS Mysql', 'RDS Postgres', 'Sqlite'];

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          variant="fullWidth"
          value={value}
          onChange={handleChange}
          aria-label="wrapped label basic tabs"
          className="db-login-tabs"
        >
          {dbNames.map((db, idx) => (
            <Tab
              label={db}
              wrapped
              {...a11yProps(idx)}
              className="db-login-tab"
              key={db}
            />
          ))}
        </Tabs>
      </Box>
      <TabPanel value={value} index={0}>
        {inputFieldsToRender.mysql}
      </TabPanel>
      <TabPanel value={value} index={1}>
        {inputFieldsToRender.pg}
      </TabPanel>
      <TabPanel value={value} index={2}>
        {inputFieldsToRender.rds_mysql}
      </TabPanel>
      <TabPanel value={value} index={3}>
        {inputFieldsToRender.rds_pg}
      </TabPanel>
      <TabPanel value={value} index={4}>
        {inputFieldsToRender.sqlite}
      </TabPanel>

      <ButtonContainer>
        <StyledButton
          variant="contained"
          color="secondary"
          onClick={handleClose}
        >
          Cancel
        </StyledButton>
        <StyledButton
          variant="contained"
          color="primary"
          onClick={handleSubmit}
        >
          Save
        </StyledButton>
      </ButtonContainer>
    </Box>
  );
}
