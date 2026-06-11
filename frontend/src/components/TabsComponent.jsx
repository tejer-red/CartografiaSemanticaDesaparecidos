import React from 'react';
import { Tabs } from '@radix-ui/themes';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import TimelineSlider from './TimelineSlider';
import Clustering from './Clustering';
import GlobalTimeGraph from './GlobalTimeGraph';
import DateFormCompact from './DateFormCompact';
import FetchCedulas from './FetchCedulas';
import FetchForense from './FetchForense';
import LayoutForm from './LayoutForm';
import FilterForm from './FilterForm';
import FilteredStats from './FilteredStats';
import SemanticGraph from './SemanticGraph';
import NotebookLoad from './NotebookLoad';
 
const TabsComponent = ({
  toolbarTab,
  setToolbarTab,
  tabDefs,
  isFormsVisible,
  setIsFormsVisible,
  handleSubmit,
  loading,
  fetchCedulas,
  setFetchCedulas,
  fetchForense,
  setFetchForense,
  fetchId,
  handleFetchComplete,
  handleDateSelect,
  visibleComponents,
  listNotebooksApp,
  isNotebookModalOpen,
  setIsNotebookModalOpen,
  notebookList,
}) => {
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
                  fontWeight: toolbarTab === tab.key ? "bold" : "normal",
                  color: toolbarTab === tab.key ? "#007bff" : "#333",
                  cursor: "pointer",
                  transition: "border-top 0.2s, color 0.2s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <FontAwesomeIcon icon={tab.icon} />
                <span style={{ fontSize: 12 }}>{tab.label}</span>
              </Tabs.Trigger>
            ))}
          </Tabs.List>
        </Tabs.Root>
      </header>
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
              />
              <FetchCedulas
                fetchCedulas={fetchCedulas}
                fetchId={fetchId}
                onFetchComplete={handleFetchComplete}
              />
              <FetchForense
                fetchForense={fetchForense}
                fetchId={fetchId}
                onFetchComplete={handleFetchComplete}
              />
              <TimelineSlider />
              <Clustering type="personas_sin_identificar" />
              <GlobalTimeGraph onDateSelect={handleDateSelect} />
            </div>
          )}
        </div>
        {/* Tab 2 */}
        <div style={{ display: toolbarTab === "tab2" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            <LayoutForm />
          </div>
        </div>
        {/* Tab 3 */}
        <div style={{ display: toolbarTab === "tab3" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            {visibleComponents.filterForm && <FilterForm />}
          </div>
        </div>
        {/* Tab 4 */}
        <div style={{ display: toolbarTab === "tab4" ? "block" : "none" }}>
          <div style={{ padding: 16 }}>
            {visibleComponents.currentState && <FilteredStats />}
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

export default TabsComponent;
