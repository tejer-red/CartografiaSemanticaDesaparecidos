{{ /*
  not longer called
  used like this if wanted 
                  <HeaderPanel
                  toolbarTab={toolbarTab}
                  setToolbarTab={setToolbarTab}
                  handleSubmit={handleSubmit}
                  loading={loading}
                  fetchCedulas={fetchCedulas}
                  setFetchCedulas={setFetchCedulas}
                  fetchForense={fetchForense}
                  setFetchForense={setFetchForense}
                  fetchId={fetchId}
                  handleFetchComplete={handleFetchComplete}
                  isFormsVisible={isFormsVisible}
                  visibleComponents={visibleComponents}
                  isNotebookModalOpen={isNotebookModalOpen}
                  setIsNotebookModalOpen={setIsNotebookModalOpen}
                  notebookList={notebookList}
                  listNotebooksApp={listNotebooksApp}
                />*/}}


import React from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { Calendar, LayoutDashboard, Filter, BarChart2, BookOpen } from 'lucide-react';
import DateFormCompact from './DateFormCompact';
import SemanticGraph from './SemanticGraph';
import NotebookLoad from './NotebookLoad';
import { useData } from '../context/DataContext';

const tabDefs = [
  { key: "tab1", icon: <Calendar />, label: "Fechas" },
  { key: "tab2", icon: <LayoutDashboard />, label: "Layout" },
  { key: "tab3", icon: <Filter />, label: "Filtros" },
  { key: "tab4", icon: <BarChart2 />, label: "Estadísticas" },
  { key: "tab5", icon: <BookOpen />, label: "Cuadernos" },
];

const HeaderPanel = ({ 
  toolbarTab, 
  setToolbarTab,
  handleSubmit,
  loading,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  fetchId,
  handleFetchComplete,
  isFormsVisible,
  visibleComponents,
  isNotebookModalOpen,
  setIsNotebookModalOpen,
  notebookList,
  listNotebooksApp
}) => {
  const {
    startDate,
    setStartDate,
    endDate,
    setEndDate
  } = useData();

  return (
    <>
      <header
        style={{
          width: "100%",
          background: "rgb(245, 245, 245)",
          borderBottom: "1px solid rgb(221, 221, 221)",
          marginBottom: 16,
          position: "absolute",
          zIndex: 9999,
          top: 0,
        }}
      >
        <Tabs.Root value={toolbarTab} onValueChange={setToolbarTab}>
          <Tabs.List
            style={{
              display: "flex",
              borderBottom: "1px solid #ccc",
              padding: 0,
              margin: 0,
              background: "transparent",
            }}
          >
            {tabDefs.map((tab) => (
              <Tabs.Trigger
                key={tab.key}
                value={tab.key}
                style={{
                  flex: 1,
                  padding: "12px 0",
                  border: "none",
                  borderTop:
                    toolbarTab === tab.key
                      ? "3px solid #007bff"
                      : "3px solid transparent",
                  borderBottom: "none",
                  background: "none",
                  outline: "none",
                  fontWeight:
                    toolbarTab === tab.key ? "bold" : "normal",
                  color: toolbarTab === tab.key ? "#007bff" : "#333",
                  cursor: "pointer",
                  transition: "border-top 0.2s, color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                {tab.icon}
                <span style={{ fontSize: 12 }}>{tab.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </header>

      {/* Tab Content */}
      <div
        style={{
          top: 0,
          marginTop: 49,
          position: "absolute",
          zIndex: 99,
          width: "100%",
          background: "#fff",
        }}
      >
        {/* Tab 1 */}
        <div style={{ display: toolbarTab === "tab1" ? "block" : "none" }}>
          {isFormsVisible && (
            <div className="DateForm">
              <DateFormCompact
                handleSubmit={handleSubmit}
                loading={loading}
                fetchCedulas={fetchCedulas}
                setFetchCedulas={setFetchCedulas}
                fetchForense={fetchForense}
                setFetchForense={setFetchForense}
                startDate={startDate}
                endDate={endDate}
                setStartDate={setStartDate}
                setEndDate={setEndDate}
              />
            </div>
          )}
        </div>

        {/* Tab 2 */}
        <div style={{ display: toolbarTab === "tab2" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            <p>LayoutForm()</p>
          </div>
        </div>

        {/* Tab 3 */}
        <div style={{ display: toolbarTab === "tab3" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            <p>Filter options are now in the left sidebar</p>
          </div>
        </div>

        {/* Tab 4 */}
        <div style={{ display: toolbarTab === "tab4" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            <p>Statistics are now in the left sidebar</p>
            {visibleComponents.violenceCases && <SemanticGraph />}
          </div>
        </div>

        {/* Tab 5 */}
        <div style={{ display: toolbarTab === "tab5" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            <NotebookLoad
              saveNotesToBackend={() => {
                console.log("Tab5: saveNotesToBackend called");
              }}
              loadNotesFromBackend={() => {
                console.log("Tab5: loadNotesFromBackend called");
              }}
              listNotebooks={listNotebooksApp}
              isModalOpen={isNotebookModalOpen}
              setIsModalOpen={setIsNotebookModalOpen}
              notebookList={notebookList}
            />
          </div>
        </div>
      </div>
    </>
  );
};

export default HeaderPanel;
