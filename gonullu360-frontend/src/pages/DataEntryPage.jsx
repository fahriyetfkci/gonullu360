import React, { useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import "./DataEntryPage.css";

export default function DataEntryPage() {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const allowedExtensions = ["csv", "xlsx", "xls"];

  const checkFile = (file) => {
    if (!file) {
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (!allowedExtensions.includes(extension)) {
      setSelectedFile(null);
      setError("Lütfen CSV veya Excel dosyası seçiniz.");

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
    setError("");
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    checkFile(file);
  };

  const handleUploadAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadAreaKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    checkFile(file);
  };

  const handleRemoveFile = (event) => {
    event.stopPropagation();

    setSelectedFile(null);
    setError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="data-entry-page">
      <Sidebar />

      <div className="data-entry-main">
        <Navbar />

        <main className="data-entry-content">
          <h1>Veri Girişi</h1>

          <p className="data-entry-description">
            Bu alana gönüllü listenizi
            <br />
            (Csv. Xcxl. Formatında) yükleyebilirsiniz.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="data-entry-file-input"
          />

          <div
            className={`data-entry-upload-area ${
              isDragging ? "data-entry-upload-area-dragging" : ""
            }`}
            onClick={handleUploadAreaClick}
            onKeyDown={handleUploadAreaKeyDown}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            role="button"
            tabIndex={0}
            aria-label="Gönüllü listesini yükle"
          >
            <div className="data-entry-upload-icon">
              <span>↑</span>
            </div>

            {selectedFile ? (
              <div className="data-entry-selected-file">
                <span className="data-entry-file-name">
                  {selectedFile.name}
                </span>

                <button
                  type="button"
                  className="data-entry-remove-file"
                  onClick={handleRemoveFile}
                  aria-label="Seçilen dosyayı kaldır"
                  title="Dosyayı kaldır"
                >
                  ×
                </button>
              </div>
            ) : (
              <span className="data-entry-upload-text">
                Sürükle Bırak
              </span>
            )}
          </div>

          <div className="data-entry-feedback">
            {error && (
              <p className="data-entry-error">
                {error}
              </p>
            )}
          </div>

          <a
            className="data-entry-example-button"
            href={`${import.meta.env.BASE_URL}ornek-gonullu-formu.xlsx`}
            download="ornek-gonullu-formu.xlsx"
          >
            Örnek Excel Formu
          </a>
        </main>
      </div>
    </div>
  );
}