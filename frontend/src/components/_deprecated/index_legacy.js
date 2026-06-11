import React from 'react';
import ReactDOM from 'react-dom';
import { DataProvider } from './context/DataContext';
import App from './App';
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";

ReactDOM.render(
  <DataProvider>
		<Theme>
      <App />
		</Theme>
  </DataProvider>,
  document.getElementById('root')
);
