import React from 'react';
import { Typography } from '@mui/material';
import styled from 'styled-components';
import { DatabaseInfo } from '../../../../shared/types/types';

interface DatabaseDetailsProps {
  db: DatabaseInfo | undefined;
}

// Container
const Container = styled.a`
  display: flex;
  justify-content: space-between;
`;

function DatabaseDetails({ db }: DatabaseDetailsProps) {
  if (!db) return null;
  return (
    <Container>
      <Typography variant="body1">
        {`Database: ${db.db_name} (${db.db_size})`}
        {/* <br /> */}
        {/* {`Database Size: ${db.db_size}`} */}
      </Typography>
    </Container>
  );
}

export default DatabaseDetails;
