// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { CheckboxVisibility, DetailsList, DetailsListLayoutMode, IColumn, mergeStyles } from '@fluentui/react';
import classNames from "classnames";
import { nanoid } from "nanoid";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DropZone } from "./drop-zone"
import styles from "./file-picker.module.css";
import { FilesList } from "./files-list";
import cstyle from "./Tda.module.css" 
import Papa from "papaparse";
import {postTd, processCsvAgentResponse, refresh, getTempImages, streamTdData, getMaxCSVFileSize, getMaxCSVFileSizeType } from "../../api";
import { Button } from 'react-bootstrap';
import estyles from "../../components/Example/Example.module.css";
import { Example } from "../../components/Example";
import { DocumentDataFilled, TableSearchFilled } from "@fluentui/react-icons";
import CharacterStreamer from '../../components/CharacterStreamer/CharacterStreamer';


interface Props {
  folderPath: string;
  tags: string[];
}

const Tda = ({folderPath, tags}: Props) => {
  const [streamKey, setStreamKey] = useState(0);
  const [files, setFiles] = useState<any>([]);
  const [progress, setProgress] = useState(0);
  const [uploadStarted, setUploadStarted] = useState(false);
  const folderName = folderPath;
  const tagList = tags;
  const [fileUploaded, setFileUploaded] = useState(false);
  const [output, setOutput] = useState('');
  const [otherq, setOtherq] = useState('');
  const [selectedQuery, setSelectedQuery] = useState('');
  const [dataFrame, setDataFrame] = useState<object[]>([]);
  const [renderAnswer, setRenderAnswer] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [fileu, setFile] = useState<File | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [maxCSVFileSize, setMaxCSVFileSize] = useState<getMaxCSVFileSizeType | null>(null);
  // A list of strings representing the conversation history
  const [conversationHistory, setConversationHistory] = useState<string[]>([]);

  type ExampleModel = {
    text: string;
    value: string;
};

const EXAMPLES: ExampleModel[] = [
    {
      text: "Click to Classify file into its Data Classification", 
      value: `You are a data classification expert.
      Classify the last uploaded data/ document into its data classification. Do not take conversation history into account.
      Look through the uploaded data/ document and answer the questions about it in a logical manner from point 1.1 until you arrive at the final answer (5.1.) for classification.
      note: ARES = A*STAR RESEARCH ENTITIES

      [DETERMINE GOVERNMENT OR ARES DATA]
      1.1.
      Does the data/ document consist of government/ statutory board data and systems? This could mean:
        - Data is generated from government system, or
        - Data is transmited through government enterprise network, or
        - Data is used to serve statutory board functions, or
        - Data is involved with government/ public sector.
      If yes, proceed to point 2.1. If no, check if the data deals with ARES data and systems. This could mean:
        - data is generated from ARES system, or
        - data is transmitted through A*STAR NEtwork, or
        - data is used to serve ARES functions
      If yes, proceed to point 3.1. If no or unsure, mention that data is assumed to be from ARES data and systems and proceed to point 3.1.


      [GOVT SECURITY CLASSIFICATION]
      2.1.
      Does unauthorized disclosure of the data/ document cause either i.) SERIOUS damage to agency (e.g., disrupt agency's critical processes, rendering it unable to discharge its functions)
      or ii.) some damage to national interests/ security?
      If yes, the {Security Classification} is "CONFIDENTIAL & ABOVE" and proceed to 4.1. If no, proceed to 1.2.

      2.2. 
      Does unauthorized disclosure of the data/ document cause SOME damage to agency (e.g., impediment of agency's processes resulting in hindrance to the discharge of its functions)?
      If yes, the {Security Classification} is "RESTRICTED" and proceed to 4.1. If no, proceed to 1.3.

      2.3. 
      Is the data publicly available (e.g., websites)? If yes, the {Security Classification} is "OFFICIAL (OPEN)" and proceed to 4.1. If no, the {Security Classification} is "OFFICIAL (CLOSED)" and proceed to 4.1.


      [ARES SECURITY CLASSIFICATION]
      3.1.
      If the data/ document is either i.) only meant to keep within a selected group, or ii.) unauthorized disclosure of the data/ document cause some damage to an individual or business 
      (e.g., IP or tech disclosure details; industry-collaboration-sensitive information; data embargoed for publication/ paper submission; sensitve data not to be widely shared within A*STAR),
      the {Security Classification} is "ARES CONFIDENTIAL & ABOVE" and proceed to 4.1. If no, proceed to 3.2.

      3.2.
      Is the data publicly available (e.g., ARES websites, ARES social media)? If yes, the {Security Classification} is "ARES PUBLIC" and proceed to 4.1.
      If it is not publicly available and meant to be kept within ARES or internal between parties (e.g., eDMs; HR or Finance manuals; Raw scientific data), the {Security Classification} is "ARES PRIVATE" and proceed to 4.1.


      [INFORMATION SENSITIVITY FRAMEWORK]
      4.1.
      Does unauthorized disclosure of the data/ document cause SERIOUS damage to an individual or business? 
      (e.g., cause serious physical, financial or sustained emotional injury or social stigma to the individual; 
      cause sustained financial loss such as in inability to conduct normal business operations, significant and irreversible loss of competitive advantage, or major damage to reputation).
      If yes, the {INFORMATION SENSITIVITY} is "SENSITIVE HIGH" and proceed to 5.1. If no, proceed to 4.2.

      4.2.
      Does unauthorized disclosure of the data/ document cause ANY damage to an individual or business? (e.g., emotional distress to individual; reduced comeptitiveness or compromise to business interests)
      If yes, the {INFORMATION SENSITIVITY} is "SENSITIVE NORMAL" and proceed to 5.1. If no, the {INFORMATION SENSITIVITY} is "NON-SENSITIVE" and proceed to 5.1.


      [COMBINE SECURITY CLASSIFICATION AND INFORMATION SENSITIVITY]
      5.1. Your FINAL recommendation for the data classification should in the following format:
      “{Security Classification}”, “{INFORMATION SENSITIVITY}”.

      Be clear and concise in your answer.
      Answer in the following format:
      “{Security Classification}”, “{INFORMATION SENSITIVITY}”
      {Brief explanation on how you arrived at your answers}.
      `
    }
];

interface Props {
    onExampleClicked: (value: string) => void;
}

const fetchImages = async () => {
  console.log('fetchImages called');
  const tempImages = await getTempImages();
  console.log('tempImages:', tempImages);
  setImages(tempImages);
  console.log('images:', images);
};
  const setOtherQ = (selectedQuery: string) => {
    if (inputValue != "") {
      return inputValue;
    }
    return selectedQuery;
  };

  const handleAnalysis = () => {
    setImages([])
    setOutput('');
    setRenderAnswer(true);
    setTimeout(async () => {
      if (files.length === 0) {
        alert("No files selected for upload.");
        return;
      }
      try {
        const query = setOtherQ(selectedQuery);
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
        if (fileu) {
          eventSourceRef.current = await streamTdData(query, fileu);
          console.log('EventSource opened');
          console.log(eventSourceRef.current);
          setStreamKey(prevKey => prevKey + 1);
        } else {
          setOutput("no file file has been uploaded.")
        }
      } catch (error) {
        console.log(error);
        setRenderAnswer(false);
      }
    }, 0);
  };

    // Handle the analysis here
  
  
  const handleAnswer = async () => {
    setStreamKey(prevKey => prevKey + 1);
    let lastError;
    const retries: number = 3;
    for (let i = 0; i < retries; i++) {
      try {
        setImages([]);
        const trimmedHistory = conversationHistory.slice(-5).join("\n");
        const query = setOtherQ(selectedQuery);
        const fullPrompt = trimmedHistory
        ? `Conversation History:\n${trimmedHistory}\n\nUser: ${query}`
        : `User: ${query}`;

        setOutput('');
        setRenderAnswer(true);
        if (fileu) {
          const result = await processCsvAgentResponse(fullPrompt, fileu);
          setOutput(result.toString());
          // Update conversation history with the latest exchange
          setConversationHistory((prev) => [...prev, `User: ${query}`, `Assistant: ${result.toString()}`]);
          fetchImages();
          return;
        }
        else {
          setOutput("no file has been uploaded.")
        }
      } catch (error) {
        lastError = error;
      }
    }
  // If the code reaches here, all retries have failed. Handle the error as needed.
    console.error(lastError);
    setOutput('An error occurred.');
  };

  const handleExampleClick = async (value: string) => {
    // Update the input value and selected query
    // setInputValue(value);
    setSelectedQuery(value);
    // Immediately trigger the analysis
    await handleAnswer();
  };


  // handler called when files are selected via the Dropzone component

  const handleQueryChange = (value: string) => {
    setInputValue(value);
    setSelectedQuery(value);
    // Handle the selected query here
};
  
  const handleOnChange = useCallback((files: FileList) => {
    const filesArray = Array.from(files).map((file: File) => ({
        id: nanoid(),
        file,
    }));
  
    setFiles(filesArray);
    if (filesArray.length) {
        setFile(filesArray[0].file); // set the first file for later processing
    }
    setProgress(0);
    setUploadStarted(false);
  }, []);


  useEffect(() => {
    const fetchMaxCSVFileSize = async () => {
        const size = await getMaxCSVFileSize();
        console.log(size.MAX_CSV_FILE_SIZE)
        setMaxCSVFileSize(size);
    };

    fetchMaxCSVFileSize();
}, []);

  // handle for removing files form the files list view
  const handleClearFile = useCallback((id: any) => {
    setFiles((prev: any) => prev.filter((file: any) => file.id !== id));
  }, []);

  // whether to show the progress bar or not
  const canShowProgress = useMemo(() => files.length > 0, [files.length]);
  const MAX_CSV_FILE_SIZE = Number(maxCSVFileSize?.MAX_CSV_FILE_SIZE) * 1024 * 1024; // 5 MB default
  
  // execute the upload operation
  const handleUpload = useCallback(async () => {
    try {
      // setFile(null);
      setUploadStarted(true);
      const uploadPromises = files.map((indexedFile: any) => {
        return new Promise<void>((resolve, reject) => {
          const file = indexedFile.file as File;
          console.log('MAX_CSV_FILE_SIZE:', MAX_CSV_FILE_SIZE);
          if (file.size > MAX_CSV_FILE_SIZE) {
            alert(
              `File is too large. Please upload a file smaller than ${maxCSVFileSize?.MAX_CSV_FILE_SIZE} MB.`
            );
            setUploadStarted(false);
            reject();
            return;
          }
  
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/file", true);
  
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percentComplete = (event.loaded / event.total) * 100;
              setProgress(percentComplete);
            }
          };
  
          xhr.onload = () => {
            if (xhr.status === 200) {
              setProgress(100);
              console.log(`File posted successfully: ${xhr.responseText}`);
              // Set the file so it will be available for analysis
              setFile(file);
              resolve();
            } else {
              console.error("Error posting file:", xhr.statusText);
              reject();
            }
          };
  
          xhr.onerror = () => {
            console.error("Error posting file:", xhr.statusText);
            reject();
          };
  
          const data = new FormData();
          data.append("file", file);
          data.append("file_path", folderPath === "" ? file.name : `${folderPath}/${file.name}`);
          if (tags.length > 0) {
            data.append("tags", tags.map(encodeURIComponent).join(","));
          }
  
          xhr.send(data);
        });
      });
      await Promise.all(uploadPromises);
      setUploadStarted(false);
    } catch (error) {
      console.error("Error uploading files: ", error);
    }
  }, [files, MAX_CSV_FILE_SIZE, maxCSVFileSize, folderPath, tags]);


// set progress to zero when there are no files
  useEffect(() => {
    if (files.length < 1) {
      setProgress(0);
    }
  }, [files.length]);

  // set uploadStarted to false when the upload is complete
  useEffect(() => {
    if (progress === 100) {
      setUploadStarted(false);
    }
  }, [progress]);


  const firstRender = useRef(true);

  useEffect(() => {
      if (firstRender.current) {
          // Skip the effect on the first render
          firstRender.current = false;
      } else {
        if (fileu) {
          handleAnswer();
        }
        else {
          setOutput("no file file has been uploaded.")
        }
      }
  }, [selectedQuery]);
  let indexLength = 0;
if (dataFrame.length > 0) {
  for (let i = 0; i < dataFrame.length; i++) {
    const length = String(i).length;
    if (length > indexLength) {
      indexLength = length;
    }
  }
}

const handleCloseEvent = () => {
  if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      fetchImages();
      console.log('EventSource closed');
  }
}
 

  const columnLengths: { [key: string]: number } = dataFrame.reduce((lengths: { [key: string]: number }, row: Record<string, any>) => {
    Object.keys(row).forEach((key) => {
      const valueLength = Math.max(String(row[key]).length, key.length);
      if (!lengths[key] || valueLength > lengths[key]) {
        lengths[key] = valueLength;
      }
    });
    return lengths;
  }, Object.keys(dataFrame[0] || {}).reduce((lengths: { [key: string]: number }, key: string) => {
    lengths[key] = key.length;
    return lengths;
  }, {} as { [key: string]: number }));
  const columns: IColumn[] = [
    {
      key: 'index',
      name: '',
      fieldName: 'index',
      minWidth: indexLength * 8,
      maxWidth: indexLength * 8,
      isResizable: true,
    },
    // Add more columns dynamically based on the dataFrame
    ...Object.keys(dataFrame[0] || {}).map((key) => ({
      key,
      name: key,
      fieldName: key,
      minWidth: columnLengths[key] * 8,
      maxWidth: columnLengths[key] * 8,
      isResizable: true,
    })),
  ];
  
  const items = dataFrame.map((row, index) => ({ index, ...row }));

  const uploadComplete = useMemo(() => progress === 100, [progress]);


  return (<div className={cstyle.contentArea} >
    <div className={cstyle.App} >
    <TableSearchFilled fontSize={"6rem"} primaryFill={"#7719aa"} aria-hidden="true" aria-label="Supported File Types" />
    <h1 className={cstyle.EmptyStateTitle}>
      Data Classification
    </h1>
    <span className={styles.chatEmptyObjectives}>
      <i className={cstyle.centertext}>Information Assistant uses AI. Check for mistakes.</i> <a href="https://github.com/microsoft/PubSec-Info-Assistant/blob/main/docs/transparency.md" target="_blank" rel="noopener noreferrer"> Transparency Note</a>
    </span>
    
    
    <div className={cstyle.centeredContainer}>
    <h2 className={styles.EmptyStateTitle}>Supported file types</h2>


    <DocumentDataFilled fontSize={"40px"} primaryFill={"#7719aa"} aria-hidden="true" aria-label="Data" />
            <span className={cstyle.EmptyObjectivesListItemText}><b>Data</b><br />
                csv, pdf, doc, docx, txt, ppt, pptx<br />
            </span>
            <span className={cstyle.EmptyObjectivesListItemText}>
            Max file size: {maxCSVFileSize?.MAX_CSV_FILE_SIZE} MB
            </span>
    <br />
    <div className={styles.wrapper}>
      
      {/* canvas */}
      <div className={styles.canvas_wrapper}>
        <DropZone onChange={handleOnChange} accept={[".csv", ".pdf", ".doc", ".docx", ".txt", ".ppt", ".pptx"]} />
      </div>

      {/* files listing */}
      {files.length ? (
        <div className={styles.files_list_wrapper}>
          <FilesList
            files={files}
            onClear={handleClearFile}
            uploadComplete={uploadComplete}
          />
        </div>
      ) : null}

      {/* progress bar */}
      {canShowProgress ? (
        <div className={styles.files_list_progress_wrapper}>
          <progress value={progress} max={100} style={{ width: "100%" }} />
        </div>
      ) : null}

      {/* upload button */}
      {files.length ? (
        <button
          onClick={handleUpload}
          className={classNames(
            styles.upload_button,
            uploadComplete || uploadStarted ? styles.disabled : ""
          )}
          aria-label="upload files"
        >
          {`Upload ${files.length} Files`}
        </button>
      ) : null}
    </div>
    
    {/* <p>Select an example query:</p> */}
    <div >
        <ul className={estyles.examplesNavList}>
            {EXAMPLES.map((example, index) => (
                <li key={index}>
                    <Example text={example.text} value={example.value} onClick={() => handleExampleClick(example.value)} />
                </li>
            ))}
        </ul>
    <div >
    
    <br></br>
    <p>Ask a question about your file:</p>
    <input
      className={cstyle.inputField}
      type="text"
      placeholder="Enter your query"
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
    />
     <div className={cstyle.buttonContainer}>
    {/* <Button variant="secondary" onClick={handleAnalysis}>Here is my analysis</Button> */}
    <Button variant="secondary" onClick={handleAnswer}>Enter</Button>
    </div>
    { (
      <div style={{width: '100%'}}>
        <h2>Agent Response:</h2>
        <div>
          { renderAnswer && 
          <CharacterStreamer key={streamKey} eventSource={eventSourceRef.current} classNames={cstyle.centeredAnswerContainer} nonEventString={output} onStreamingComplete={handleCloseEvent} typingSpeed={10} /> }
        {/* </div>
        <h2>Generated Images:</h2>
        <div>
          {images.length > 0 ? (
            images.map((image, index) => (
              <img 
                key={index} 
                src={`data:image/png;base64,${image}`} 
                alt={`Temp Image ${index}`} 
                style={{maxWidth: '100%'}} 
              />
            ))
          ) : (
            <p>No images generated</p>
          )} */}
        </div>
        <div className={cstyle.raiwarning}>AI-generated content may be incorrect</div>

      </div>
    )}
      </div>
      </div>
      
      
    </div>
    
    {/* <div className={cstyle.centeredContainer}>
    <details style={{ width: '100%' }}>
  <summary>See Dataframe (if file is csv)</summary>
  <div style={{ width: '100%', height: '500px', overflow: 'auto', direction: 'rtl'  }}>
  <div style={{ direction: 'ltr' }}>
  <DetailsList
  items={items}
  className={cstyle.mydetailslist}
  columns={columns}
  setKey="set"
  layoutMode={DetailsListLayoutMode.justified}
  selectionPreservedOnEmptyClick={true}
  checkboxVisibility={CheckboxVisibility.hidden}
/>
</div>
  </div>
</details>
    </div> */}
    </div>
</div>
  );
};

export { Tda };
