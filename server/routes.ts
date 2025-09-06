import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./databaseStorage";
import { ZodError, z } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import {
  insertScientistSchema,
  insertResearchActivitySchema,
  insertProjectMemberSchema,
  insertDataManagementPlanSchema,
  insertPublicationSchema,
  insertPublicationAuthorSchema,
  insertPatentSchema,
  insertIrbApplicationSchema,
  insertIbcApplicationSchema,
  insertIbcApplicationCommentSchema,
  insertIbcBoardMemberSchema,
  insertIbcSubmissionSchema,
  insertIbcDocumentSchema,
  insertResearchContractSchema,
  insertProgramSchema,
  insertProjectSchema,
  insertBuildingSchema,
  insertRoomSchema,
  insertIbcApplicationRoomSchema,
  insertIbcBackboneSourceRoomSchema,
  insertIbcApplicationPpeSchema,
  insertRolePermissionSchema,
  insertGrantSchema,
  insertCertificationModuleSchema,
  insertCertificationSchema,
  insertCertificationConfigurationSchema,
  insertPdfImportHistorySchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up API routes
  const apiRouter = app.route('/api');

  // Health check for database connection
  app.get('/api/health/database', async (req: Request, res: Response) => {
    try {
      // Test database connection with a simple query
      await storage.getDashboardStats();
      res.json(true);
    } catch (error) {
      console.error("Database health check failed:", error);
      res.json(false);
    }
  });

  // Object Storage Routes
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Certificate processing - batch detection with OCR
  app.post("/api/certificates/process-batch", async (req, res) => {
    try {
      const { fileUrls } = req.body;
      if (!fileUrls || !Array.isArray(fileUrls)) {
        return res.status(400).json({ message: "File URLs array is required" });
      }

      const modules = await storage.getCertificationModules();
      const results = [];

      for (const fileUrl of fileUrls) {
        try {
          let detectedData: any = {
            fileName: fileUrl.split('/').pop(),
            filePath: fileUrl,
            originalUrl: fileUrl,
            status: 'processing',
            extractedText: null,
            parsedData: null
          };

          const startTime = Date.now();
          
          // Create initial PDF import history entry
          const historyEntry = await storage.createPdfImportHistoryEntry({
            fileName: detectedData.fileName || 'unknown',
            fileUrl: fileUrl,
            uploadedBy: 1, // TODO: Get from session/auth
            processingStatus: 'processing',
            ocrProvider: 'unknown'
          });

          // Check file type first, before attempting any OCR
          let contentType = '';
          let isPDF = false;
          let isValidFile = false;
          
          try {
            console.log('Checking file type via HEAD request...');
            const headResponse = await fetch(fileUrl, { method: 'HEAD' });
            contentType = headResponse.headers.get('content-type') || '';
            console.log(`Content-Type: ${contentType}`);
            
            // Check for supported file types - be more lenient with detection
            if (contentType.includes('pdf') || contentType.includes('application/pdf')) {
              isPDF = true;
              isValidFile = true;
              console.log('PDF detected via Content-Type');
            } else if (
              contentType.includes('image/') || 
              contentType.includes('image/jpeg') || 
              contentType.includes('image/jpg') || 
              contentType.includes('image/png') || 
              contentType.includes('image/gif') || 
              contentType.includes('image/bmp') ||
              contentType.includes('image/tiff')
            ) {
              isValidFile = true;
              console.log('Image file detected via Content-Type');
            } else {
              // For unknown content types, try filename-based detection first
              console.log(`Unknown content type: ${contentType}, checking filename...`);
              try {
                const url = new URL(fileUrl);
                const pathSegments = url.pathname.split('/');
                const fileName = pathSegments[pathSegments.length - 1];
                
                if (fileName && fileName.toLowerCase().includes('pdf')) {
                  isPDF = true;
                  isValidFile = true;
                  console.log('PDF detected via filename despite unknown content-type');
                } else if (fileName && /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(fileName)) {
                  isValidFile = true;
                  console.log('Image file detected via filename despite unknown content-type');
                } else {
                  // As last resort, assume PDF for certificate processing and try OCR
                  console.log(`Assuming PDF format for certificate processing despite content-type: ${contentType}`);
                  isPDF = true;
                  isValidFile = true;
                }
              } catch (urlError) {
                // If all detection fails, still try as PDF since user uploaded for certificate processing
                console.log('Filename detection failed, assuming PDF for certificate processing');
                isPDF = true;
                isValidFile = true;
              }
            }
          } catch (headerError) {
            console.log('Could not detect file type via headers, checking URL...');
            // Fallback: try URL-based detection
            try {
              const url = new URL(fileUrl);
              const pathSegments = url.pathname.split('/');
              const fileName = pathSegments[pathSegments.length - 1];
              if (fileName && fileName.toLowerCase().includes('pdf')) {
                isPDF = true;
                isValidFile = true;
                console.log('PDF detected via filename in URL');
              } else if (fileName && /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(fileName)) {
                isValidFile = true;
                console.log('Image file detected via filename in URL');
              } else {
                console.log('Could not detect valid file type from URL');
                detectedData.status = 'error';
                detectedData.error = 'Could not determine file type. Please ensure file is a PDF or image format.';
                
                // Update history entry with error
                await storage.updatePdfImportHistoryEntry(historyEntry.id, {
                  processingStatus: 'failed',
                  errorMessage: detectedData.error,
                  processedAt: new Date(),
                  processingTimeMs: Date.now() - startTime
                });
                
                results.push(detectedData);
                continue; // Skip OCR processing
              }
            } catch (urlError) {
              console.log('Could not detect file type from URL either');
              detectedData.status = 'error';
              detectedData.error = 'Could not determine file type. Please ensure file is a PDF or image format.';
              
              // Update history entry with error
              await storage.updatePdfImportHistoryEntry(historyEntry.id, {
                processingStatus: 'failed',
                errorMessage: detectedData.error,
                processedAt: new Date(),
                processingTimeMs: Date.now() - startTime
              });
              
              results.push(detectedData);
              continue; // Skip OCR processing
            }
          }
          
          // Only proceed if we have a valid file type
          if (!isValidFile) {
            console.log('File type validation failed, skipping OCR processing');
            continue;
          }

          // Get OCR configuration and perform OCR based on settings
          try {
            // Get OCR service configuration
            const ocrConfig = await storage.getSystemConfiguration('ocr_service');
            const ocrSettings = ocrConfig?.value as any || { provider: 'ocr_space' }; // Default to OCR.space for PDF support
            
            // Auto-switch to OCR.space for PDFs since Tesseract doesn't support them
            let provider = ocrSettings.provider;
            
            // Force OCR.space for PDFs regardless of current setting
            if (isPDF) {
              provider = 'ocr_space';
              console.log('Forcing OCR.space for PDF processing');
            }
            
            detectedData.status = 'processing';
            console.log(`Processing OCR for file: ${fileUrl} using ${provider}`);

            let extractedText = '';

            if (provider === 'ocr_space') {
              // Use OCR.space API
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 30000);

              try {
                console.log('Attempting OCR.space API call...');
                console.log('API Key available:', !!(process.env.OCR_SPACE_API_KEY || ocrSettings.ocrSpaceApiKey));
                console.log('File URL length:', fileUrl.length);
                
                // OCR.space API uses GET with query parameters
                const apiKey = process.env.OCR_SPACE_API_KEY || ocrSettings.ocrSpaceApiKey || 'helloworld';
                
                // Download file using GCS client (bypasses URL access restrictions)
                console.log('Downloading file from GCS for OCR.space upload...');
                
                // Parse GCS URL to extract bucket and object name
                // URL format: https://storage.googleapis.com/bucket-name/.private/uploads/filename?X-Goog-Algorithm=...
                const urlParts = fileUrl.split('?')[0]; // Remove query params
                const pathParts = urlParts.split('/');
                const bucketName = pathParts[3]; // storage.googleapis.com/BUCKET/...
                const objectName = pathParts.slice(4).join('/'); // Everything after bucket name
                
                console.log(`Downloading from bucket: ${bucketName}, object: ${objectName}`);
                
                // Import the GCS client
                const { objectStorageClient } = await import('./objectStorage');
                const bucket = objectStorageClient.bucket(bucketName);
                const file = bucket.file(objectName);
                
                // Download file content
                const [fileContent] = await file.download();
                const fileBuffer = fileContent.buffer;
                const fileBlob = new Blob([fileBuffer], { type: 'application/pdf' });
                
                console.log('Uploading file to OCR.space...', fileBlob.size, 'bytes');
                
                // Use file upload instead of URL method (more reliable)
                const formData = new FormData();
                formData.append('file', fileBlob, 'certificate.pdf');
                formData.append('apikey', apiKey);
                formData.append('language', 'eng');
                formData.append('isOverlayRequired', 'false');
                formData.append('filetype', 'PDF');
                formData.append('detectOrientation', 'false');
                formData.append('isCreateSearchablePdf', 'false');
                formData.append('isSearchablePdfHideTextLayer', 'false');
                formData.append('scale', 'true');
                formData.append('isTable', 'false');
                formData.append('OCREngine', '2');

                const ocrResponse = await fetch('https://api.ocr.space/parse/image', {
                  method: 'POST',
                  body: formData,
                  signal: controller.signal
                });
                
                console.log('OCR.space response status:', ocrResponse.status);
                console.log('OCR.space response headers:', Object.fromEntries(ocrResponse.headers.entries()));

                clearTimeout(timeoutId);

                if (ocrResponse.ok) {
                  const ocrResult = await ocrResponse.json();
                  console.log('OCR.space API Response:', JSON.stringify(ocrResult, null, 2));
                  
                  // Check for page limit error (E301) - reject files with >2 pages
                  if (ocrResult.IsErroredOnProcessing === true) {
                    const errorMessages = Array.isArray(ocrResult.ErrorMessage) ? ocrResult.ErrorMessage : [ocrResult.ErrorMessage];
                    const hasPageLimitError = errorMessages.some((msg: string) => 
                      msg && msg.includes('maximum page limit') && msg.includes('3')
                    );
                    
                    if (hasPageLimitError) {
                      console.error('Document exceeds 2-page limit, rejecting');
                      throw new Error('Document rejected: CITI certificates should be 2 pages maximum. Multi-page merged reports are not supported. Please upload individual certificate reports only.');
                    }
                    
                    console.error('OCR processing error:', errorMessages);
                    throw new Error(errorMessages.join(', ') || 'OCR processing failed');
                  }
                  
                  if (ocrResult.IsErroredOnProcessing === false && ocrResult.ParsedResults?.length > 0) {
                    extractedText = ocrResult.ParsedResults[0].ParsedText;
                    console.log(`OCR Extracted Text Length: ${extractedText.length} characters`);
                    console.log('First 500 characters of extracted text:', extractedText.substring(0, 500));
                  } else {
                    console.error('OCR processing error:', ocrResult.ErrorMessage || ocrResult);
                    throw new Error(ocrResult.ErrorMessage || 'OCR processing failed');
                  }
                } else {
                  const errorText = await ocrResponse.text();
                  console.error('OCR.space HTTP error:', ocrResponse.status, errorText);
                  throw new Error(`Failed to connect to OCR.space service: ${ocrResponse.status}`);
                }
              } catch (apiError: any) {
                console.error('OCR.space failed:', apiError.message);
                console.log('Falling back to Tesseract.js...');
                // Don't throw error yet, let it fall back to Tesseract
                clearTimeout(timeoutId);
                extractedText = null; // Signal to use fallback
              }
            }

            // If OCR.space failed or wasn't used, try Tesseract.js as fallback (only for image formats)
            if (!extractedText) {
              // Check if this is a PDF file - if so, we can't use Tesseract as fallback
              let isPdfFile = false;
              try {
                const headResponse = await fetch(fileUrl, { method: 'HEAD' });
                const contentType = headResponse.headers.get('content-type') || '';
                isPdfFile = contentType.includes('pdf') || contentType.includes('xml'); // XML returned for PDFs in some cases
              } catch (headerError) {
                console.log('Could not check file type for fallback decision');
              }

              if (isPdfFile) {
                console.log('PDF file detected - Tesseract.js cannot process PDF files, only OCR.space supports PDFs');
                throw new Error('PDF OCR processing failed - OCR.space returned E301 error and Tesseract.js cannot process PDF files');
              }

              // Use Tesseract.js (fallback for image files only)
              console.log('Attempting Tesseract.js fallback for image file...');
              try {
                // Check file format first - handle signed URLs properly
                let fileExtension = '';
                try {
                  // For signed URLs, try to extract the original filename or use Content-Type
                  const url = new URL(fileUrl);
                  const pathSegments = url.pathname.split('/');
                  const fileName = pathSegments[pathSegments.length - 1];
                  
                  // If we have a clean filename with extension, use it
                  if (fileName && fileName.includes('.')) {
                    fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                  } else {
                    // For signed URLs without clear extensions, try to fetch headers
                    try {
                      const headResponse = await fetch(fileUrl, { method: 'HEAD' });
                      const contentType = headResponse.headers.get('content-type') || '';
                      
                      if (contentType.includes('image/')) {
                        // Extract image format from content type
                        const imageType = contentType.split('/')[1]?.split(';')[0];
                        fileExtension = imageType || '';
                      }
                    } catch (headerError) {
                      console.log('Could not fetch file headers, proceeding with OCR attempt');
                    }
                  }
                } catch (urlError) {
                  console.log('Could not parse URL for format detection, proceeding with OCR attempt');
                }

                const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp'];
                if (fileExtension && !supportedFormats.includes(fileExtension)) {
                  console.log(`Detected file format: ${fileExtension}, proceeding with OCR attempt as detection may be inaccurate for signed URLs`);
                }

                const { createWorker } = await import('tesseract.js');
                let worker = null;
                
                try {
                  worker = await createWorker(ocrSettings.tesseractOptions?.language || 'eng');
                  
                  // Add timeout to prevent hanging
                  const recognitionPromise = worker.recognize(fileUrl);
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('OCR processing timed out after 60 seconds')), 60000)
                  );
                  
                  const { data: { text } } = await Promise.race([recognitionPromise, timeoutPromise]) as any;
                  extractedText = text;
                } catch (tesseractError: any) {
                  console.error('Tesseract.js error:', tesseractError);
                  // Set extracted text to empty to trigger fallback handling
                  extractedText = '';
                  throw new Error(`Tesseract OCR failed: ${tesseractError?.message || 'Unsupported image format or processing error'}`);
                } finally {
                  if (worker) {
                    try {
                      await worker.terminate();
                    } catch (terminateError) {
                      console.error('Error terminating Tesseract worker:', terminateError);
                    }
                  }
                }
              } catch (importError: any) {
                console.error('Error importing Tesseract.js:', importError);
                extractedText = '';
                throw new Error(`Failed to load OCR library: ${importError?.message || 'OCR module not available'}`);
              }
            }

            if (extractedText && extractedText.trim().length > 0) {
              detectedData.extractedText = extractedText;
              console.log(`OCR extracted ${extractedText.length} characters using ${provider}`);

              // Parse CITI certificate data from extracted text
              console.log('Starting certificate parsing...');
              console.log('Available modules:', modules.map(m => m.name));
              const parsedData = parseCITICertificate(extractedText, modules);
              console.log('Parsing result:', JSON.stringify(parsedData, null, 2));
              detectedData = {
                ...detectedData,
                ...parsedData,
                status: parsedData.name ? 'detected' : 'unrecognized'
              };

              // Update history entry with parsed data
              try {
                console.log(`Updating history entry ${historyEntry.id} with parsed data:`, {
                  processingStatus: parsedData.name ? 'completed' : 'failed',
                  hasExtractedText: !!extractedText,
                  parsedDataFields: Object.keys(parsedData).filter(k => parsedData[k] !== null),
                  processingTimeMs: Date.now() - startTime
                });
                
                const updateResult = await storage.updatePdfImportHistoryEntry(historyEntry.id, {
                  processingStatus: parsedData.name ? 'completed' : 'failed',
                  ocrProvider: provider, // Make sure OCR provider is saved
                  extractedText: extractedText,
                  parsedData: parsedData,
                  processedAt: new Date(),
                  processingTimeMs: Date.now() - startTime,
                  errorMessage: parsedData.name ? null : 'Certificate data could not be extracted - manual assignment may be required'
                });
                
                console.log('History entry update result:', updateResult ? 'SUCCESS' : 'FAILED');
              } catch (updateError) {
                console.error('Failed to update history entry:', updateError);
              }
            } else {
              detectedData.status = 'ocr_failed';
              detectedData.error = 'No text could be extracted from the file';
              
              // Update history entry with OCR failure
              try {
                console.log(`Updating history entry ${historyEntry.id} with OCR failure`);
                const updateResult = await storage.updatePdfImportHistoryEntry(historyEntry.id, {
                  processingStatus: 'failed',
                  ocrProvider: provider, // Make sure OCR provider is saved
                  errorMessage: 'No text could be extracted from the file',
                  processedAt: new Date(),
                  processingTimeMs: Date.now() - startTime
                });
                console.log('OCR failure update result:', updateResult ? 'SUCCESS' : 'FAILED');
              } catch (updateError) {
                console.error('Failed to update history entry with OCR failure:', updateError);
              }
            }
          } catch (ocrError: any) {
            console.error('OCR processing error:', ocrError);
            detectedData.status = 'ocr_failed';
            detectedData.error = `OCR processing failed: ${ocrError?.message || 'Unknown error'}`;
            detectedData.suggestion = 'OCR failed - file uploaded but data extraction was unsuccessful. You can still manually assign this certificate to a scientist.';
            
            // Update history entry with OCR error
            try {
              console.log(`Updating history entry ${historyEntry.id} with OCR error:`, ocrError?.message);
              const updateResult = await storage.updatePdfImportHistoryEntry(historyEntry.id, {
                processingStatus: 'failed',
                ocrProvider: provider, // Make sure OCR provider is saved
                errorMessage: `OCR processing failed: ${ocrError?.message || 'Unknown error'}`,
                processedAt: new Date(),
                processingTimeMs: Date.now() - startTime
              });
              console.log('OCR error update result:', updateResult ? 'SUCCESS' : 'FAILED');
            } catch (updateError) {
              console.error('Failed to update history entry with OCR error:', updateError);
            }
          }

          results.push(detectedData);
        } catch (error: any) {
          results.push({
            fileName: fileUrl.split('/').pop(),
            filePath: fileUrl,
            originalUrl: fileUrl,
            status: 'error',
            error: error?.message || 'Unknown error'
          });
        }
      }

      res.json({
        message: `Processed ${results.length} files with OCR`,
        results
      });
    } catch (error) {
      console.error("Error processing certificates:", error);
      res.status(500).json({ message: "Failed to process certificates" });
    }
  });


  // Helper function to parse CITI certificate text
  function parseCITICertificate(text: string, modules: any[]) {
    const result: any = {
      name: null,
      courseName: null,
      module: null,
      completionDate: null,
      expirationDate: null,
      recordId: null,
      institution: null,
      isNewModule: false
    };

    try {
      console.log('=== PARSING CITI CERTIFICATE ===');
      console.log('Raw text length:', text.length);
      console.log('Raw text sample (first 300 chars):', text.substring(0, 300));
      
      // DEBUG: Print full text to see actual OCR output structure
      console.log('=== FULL OCR TEXT DEBUG ===');
      console.log(text);
      console.log('=== END FULL OCR TEXT ===');
      
      // Clean up text - remove extra whitespace and normalize
      const cleanText = text.replace(/\s+/g, ' ').trim();
      console.log('Cleaned text length:', cleanText.length);
      console.log('Cleaned text sample (first 300 chars):', cleanText.substring(0, 300));

      // Extract completion date - match multiple formats
      console.log('Searching for completion date...');
      const completionMatch = 
        // Format 1: "Completion Date: 21-May-2022" (with colon)
        text.match(/Completion Date:\s*(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 2: "Completion Date 15-Jul-2025" (no colon - new format)
        text.match(/Completion Date\s+(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 3: With bullet point
        text.match(/•\s*Completion Date:?\s*(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 4: Context-based search for completion dates
        text.match(/(\d{1,2}-\w{3}-20\d{2})/g)?.find(match => {
          const matchIndex = text.indexOf(match);
          const context = text.substring(Math.max(0, matchIndex - 100), matchIndex + 100);
          return /completion/i.test(context);
        });
      if (completionMatch) {
        const dateStr = Array.isArray(completionMatch) ? completionMatch[0] : completionMatch[1];
        result.completionDate = convertDateFormat(dateStr);
        console.log('Found completion date:', result.completionDate);
      } else {
        console.log('No completion date match found');
        console.log('Date search text sample:', text.substring(0, 800));
      }

      // Extract expiration date - match multiple formats  
      console.log('Searching for expiration date...');
      const expirationMatch = 
        // Format 1: "Expiration Date: 20-May-2025" (with colon)
        text.match(/Expiration Date:\s*(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 2: "Expiration Date 15-Jul-2028" (no colon - new format)
        text.match(/Expiration Date\s+(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 3: With bullet point  
        text.match(/•\s*Expiration Date:?\s*(\d{1,2}-\w{3}-\d{4})/i) ||
        // Format 4: Context-based search for expiration dates
        text.match(/(\d{1,2}-\w{3}-20\d{2})/g)?.find(match => {
          const matchIndex = text.indexOf(match);
          const context = text.substring(Math.max(0, matchIndex - 100), matchIndex + 100);
          return /expir/i.test(context);
        });
      if (expirationMatch) {
        const dateStr = Array.isArray(expirationMatch) ? expirationMatch[0] : expirationMatch[1];
        result.expirationDate = convertDateFormat(dateStr);
        console.log('Found expiration date:', result.expirationDate);
      } else {
        console.log('No expiration date match found');
        console.log('Date search text sample:', text.substring(0, 800));
      }

      // Extract record ID - match "31911316" format with Record ID context
      console.log('Searching for record ID...');
      const recordIdMatch = text.match(/Record ID:\s*(\d+)/i) ||
                           text.match(/•\s*Record ID:\s*(\d+)/i) ||
                           text.match(/Record ID\s+(\d+)/i) ||
                           text.match(/(\d{8})/g)?.find(match => {
                             // Look for 8-digit number with Record ID context nearby
                             const matchIndex = text.indexOf(match);
                             const context = text.substring(Math.max(0, matchIndex - 50), matchIndex + 50);
                             return /record/i.test(context);
                           }) ||
                           cleanText.match(/Record ID:\s*(\d+)/i);
      if (recordIdMatch) {
        const idStr = Array.isArray(recordIdMatch) ? recordIdMatch[0] : recordIdMatch[1];
        result.recordId = idStr.replace(/\D/g, ''); // Remove any non-digits
        console.log('Found record ID:', result.recordId);
      } else {
        console.log('No record ID match found');
        console.log('ID search text sample:', text.substring(0, 800));
      }

      // Extract person name - improved patterns for CITI certificates
      console.log('Searching for person name...');
      // Look for "Name: Apryl Sanchez (ID: 8085848)" pattern - handle OCR mangled text
      let nameMatch = text.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(ID:\s*\d+\)/i) ||  // "Apryl Sanchez (ID: 8085848)"
                     text.match(/Name:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||            // "Name: Apryl Sanchez"
                     text.match(/•\s*Name:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i) ||       // "• Name: Apryl Sanchez"
                     cleanText.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)\s*\(ID:\s*\d+\)/i) || // Clean text version
                     text.match(/This is to certify that:\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/i);

      // Fix for OCR mangled text - extract just the name part if we found a longer match
      if (nameMatch) {
        let extractedName = nameMatch[1].trim();
        // If the extracted name contains extra text, try to clean it
        const nameOnly = extractedName.match(/([A-Z][a-z]+\s+[A-Z][a-z]+)$/);
        if (nameOnly) {
          extractedName = nameOnly[1];
        }
        result.name = extractedName.replace(/\s+/g, ' ');
        console.log('Found name:', result.name);
      } else {
        console.log('No name match found');
        console.log('Text being searched for name (first 500 chars):', text.substring(0, 500));
      }

      // Extract course name - improved patterns for CITI courses  
      console.log('Searching for course name...');
      // Look for "Course: [Course Name]" or "CITI Program course: [Course Name]"
      let courseMatch = text.match(/Course:\s*([^\n\r]+?)(?:\s*Stage|$)/i) ||
                       text.match(/CITI Program course:\s*\n\s*([^\n]+)/i) ||
                       text.match(/CITI Program course:\s*([^\n\r]+)/i) ||
                       text.match(/following CITI[^:]*course:\s*([^\n\r]+)/i);
      
      if (!courseMatch) {
        // Try to extract Biosafety or other training series
        courseMatch = text.match(/([^.\n]*(?:Biosafety|Training Series)[^.\n]*)/i) ||
                     text.match(/Stage\s+\d+\s*-\s*([^\n\r]+)/i) ||
                     text.match(/CITI\s+([^(\n\r]+?)(?:\s*\(|$)/i);
      }

      if (courseMatch) {
        result.courseName = courseMatch[1].trim().replace(/\s+/g, ' ');
        console.log('Found course name:', result.courseName);
        
        // Define variables for module matching
        const courseLower = result.courseName.toLowerCase();
        
        // Find matching module with enhanced matching for both formats
        const module = modules.find(m => {
          const moduleLower = m.name.toLowerCase();
          
          // Direct matches
          if (moduleLower.includes(courseLower) || courseLower.includes(moduleLower)) {
            return true;
          }
          
          // Enhanced matching for specific patterns
          const keywordMatches = [
            // Biosafety variations
            (courseLower.includes('biosafety') && moduleLower.includes('biosafety')),
            // Biomedical research variations - handle "Basic/Refresher" vs "Basic"
            (courseLower.includes('biomedical') && moduleLower.includes('biomedical') && 
             courseLower.includes('basic') && moduleLower.includes('basic')),
            // Conflict of interest
            (courseLower.includes('conflict') && moduleLower.includes('conflict')),
            // Animal-related courses
            (courseLower.includes('animal') && moduleLower.includes('animal')),
            // Human subjects
            (courseLower.includes('human') && moduleLower.includes('human')),
            // RCR - Responsible Conduct
            (courseLower.includes('responsible conduct') && moduleLower.includes('responsible conduct')),
            // IACUC
            (courseLower.includes('iacuc') && moduleLower.includes('iacuc')),
            // BCT - Biomedical Conduct
            (courseLower.includes('biomedical') && moduleLower.includes('biomedical') && 
             courseLower.includes('conduct') && moduleLower.includes('conduct'))
          ];
          
          return keywordMatches.some(match => match);
        });
        
        console.log('Module matching results:');
        console.log('Course name to match:', courseLower);
        const matchedModule = modules.find(m => {
          const mLower = m.name.toLowerCase();
          const directMatch = mLower.includes(courseLower) || courseLower.includes(mLower);
          const biomedicalMatch = courseLower.includes('biomedical') && mLower.includes('biomedical') && 
                                 courseLower.includes('basic') && mLower.includes('basic');
          const biosafetyMatch = courseLower.includes('biosafety') && mLower.includes('biosafety');
          return directMatch || biomedicalMatch || biosafetyMatch;
        });
        
        if (matchedModule) {
          console.log(`Found matching module: ${matchedModule.name}`);
        } else {
          console.log('No matching module found, will create new placeholder');
        }
        
        result.module = module || null;
        result.isNewModule = !module;
        
        if (module) {
          console.log('Matched with existing module:', module.name);
        } else {
          console.log('No matching module found, will create new placeholder');
        }
      } else {
        console.log('No course name match found');
        console.log('Text being searched for course (first 500 chars):', text.substring(0, 500));
      }

      // Extract institution - improved pattern
      const institutionMatch = text.match(/Under requirements set by:\s*\n\s*([^\n]+)/i) ||
                              text.match(/requirements set by:\s*([^\n\r]+)/i);
      if (institutionMatch) {
        result.institution = institutionMatch[1].trim();
      }

    } catch (parseError) {
      console.error('Error parsing certificate text:', parseError);
    }

    return result;
  }

  // Helper function to convert date format from "05-Mar-2025" to "2025-03-05"
  function convertDateFormat(dateStr: string): string {
    try {
      const months: { [key: string]: string } = {
        'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
        'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
        'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
      };
      
      const [day, month, year] = dateStr.split('-');
      return `${year}-${months[month]}-${day.padStart(2, '0')}`;
    } catch (error) {
      return dateStr; // Return original if conversion fails
    }
  }

  // Test endpoint for parsing certificate text (for debugging)
  app.post("/api/certificates/test-parse", async (req, res) => {
    try {
      const { sampleText } = req.body;
      if (!sampleText) {
        return res.status(400).json({ message: "Sample text is required" });
      }

      const modules = await storage.getCertificationModules();
      const parsedData = parseCITICertificate(sampleText, modules);
      
      res.json({
        message: "Text parsing test completed",
        input: sampleText.substring(0, 200) + "...",
        parsed: parsedData
      });
    } catch (error) {
      console.error("Error testing certificate parsing:", error);
      res.status(500).json({ message: "Failed to test parsing" });
    }
  });

  // Certificate batch confirmation
  app.post("/api/certificates/confirm-batch", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const { certifications } = req.body;

      if (!certifications || !Array.isArray(certifications)) {
        return res.status(400).json({ message: "Certifications array is required" });
      }

      const results = [];
      for (const cert of certifications) {
        try {
          const {
            scientistId,
            moduleId,
            startDate,
            endDate,
            certificateFilePath,
            reportFilePath,
            notes
          } = cert;

          // Validate required fields
          if (!scientistId || !moduleId || !startDate || !endDate) {
            results.push({
              ...cert,
              status: 'error',
              error: 'Missing required fields'
            });
            continue;
          }

          const certification = await storage.createCertification({
            scientistId,
            moduleId,
            startDate,
            endDate,
            certificateFilePath,
            reportFilePath,
            uploadedBy: userId,
            notes
          });

          results.push({
            ...cert,
            status: 'success',
            certificationId: certification.id
          });
        } catch (error: any) {
          results.push({
            ...cert,
            status: 'error',
            error: error?.message || 'Unknown error'
          });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      res.json({
        message: `Processed ${results.length} certifications: ${successCount} successful, ${errorCount} failed`,
        results,
        summary: { total: results.length, successful: successCount, failed: errorCount }
      });
    } catch (error) {
      console.error("Error confirming certifications:", error);
      res.status(500).json({ message: "Failed to confirm certifications" });
    }
  });

  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Dashboard
  app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard statistics" });
    }
  });

  app.get('/api/dashboard/recent-projects', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const activities = await storage.getRecentResearchActivities(limit);
      
      // Research activities are returned as-is, lead scientist info comes from team membership
      const enhancedActivities = activities;
      
      res.json(enhancedActivities);
    } catch (error) {
      console.error("Error fetching recent research activities:", error);
      res.status(500).json({ message: "Failed to fetch recent research activities" });
    }
  });

  app.get('/api/dashboard/upcoming-deadlines', async (req: Request, res: Response) => {
    try {
      const deadlines = await storage.getUpcomingDeadlines();
      res.json(deadlines);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch upcoming deadlines" });
    }
  });

  // Programs (PRM)
  app.get('/api/programs', async (req: Request, res: Response) => {
    try {
      const programs = await storage.getPrograms();
      res.json(programs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch programs" });
    }
  });

  app.get('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const program = await storage.getProgram(id);
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch program" });
    }
  });
  
  app.get('/api/programs/:id/projects', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const projects = await storage.getProjectsForProgram(id);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects for program:", error);
      res.status(500).json({ message: "Failed to fetch projects for program" });
    }
  });

  app.post('/api/programs', async (req: Request, res: Response) => {
    try {
      const validateData = insertProgramSchema.parse(req.body);
      const program = await storage.createProgram(validateData);
      res.status(201).json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create program" });
    }
  });

  app.patch('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const validateData = insertProgramSchema.partial().parse(req.body);
      const program = await storage.updateProgram(id, validateData);
      
      if (!program) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.json(program);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update program" });
    }
  });

  app.delete('/api/programs/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid program ID" });
      }

      const success = await storage.deleteProgram(id);
      
      if (!success) {
        return res.status(404).json({ message: "Program not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete program" });
    }
  });

  // Projects (PRJ)
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const programId = req.query.programId ? parseInt(req.query.programId as string) : undefined;
      
      let projects;
      if (programId && !isNaN(programId)) {
        projects = await storage.getProjectsForProgram(programId);
      } else {
        projects = await storage.getProjects();
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validateData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validateData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const validateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Scientists
  app.get('/api/scientists', async (req: Request, res: Response) => {
    try {
      const includeActivityCount = req.query.includeActivityCount === 'true';
      
      if (includeActivityCount) {
        const scientists = await storage.getScientistsWithActivityCount();
        res.json(scientists);
      } else {
        const scientists = await storage.getScientists();
        res.json(scientists);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scientists" });
    }
  });

  app.get('/api/scientists/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get research activities where scientist is a team member
      const activities = await storage.getResearchActivitiesForScientist(id);
      
      // Enhance with project and program information
      const enhancedActivities = await Promise.all(
        activities.map(async (activity) => {
          let project = null;
          let program = null;
          let memberRole = null;
          
          // Get project info if activity has projectId
          if (activity.projectId) {
            project = await storage.getProject(activity.projectId);
            
            // Get program info if project has programId
            if (project?.programId) {
              program = await storage.getProgram(project.programId);
            }
          }
          
          // Get member role from project_members table
          const members = await storage.getProjectMembers(activity.id);
          const member = members.find(m => m.scientistId === id);
          memberRole = member?.role || null;
          
          return {
            ...activity,
            project,
            program,
            memberRole
          };
        })
      );
      
      res.json(enhancedActivities);
    } catch (error) {
      console.error('Error fetching scientist research activities:', error);
      res.status(500).json({ message: 'Failed to fetch research activities' });
    }
  });

  // Get scientists filtered by role for room supervisor/manager selection
  app.get('/api/scientists/investigators', async (req: Request, res: Response) => {
    try {
      const investigators = await storage.getScientistsByRole('investigator');
      res.json(investigators);
    } catch (error) {
      console.error('Error fetching investigators:', error);
      res.status(500).json({ message: "Failed to fetch investigators" });
    }
  });

  app.get('/api/scientists/scientific-staff', async (req: Request, res: Response) => {
    try {
      const scientificStaff = await storage.getScientistsByRole('staff|management|post-doctoral|research');
      res.json(scientificStaff);
    } catch (error) {
      console.error('Error fetching scientific staff:', error);
      res.status(500).json({ message: "Failed to fetch scientific staff" });
    }
  });

  app.get('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const scientist = await storage.getScientist(id);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }

      res.json(scientist);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch scientist" });
    }
  });

  app.get('/api/scientists/:id/publications', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const yearsSince = req.query.years ? parseInt(req.query.years as string) : 5;
      const publications = await storage.getPublicationsForScientist(id, yearsSince);
      
      res.json(publications);
    } catch (error) {
      console.error('Error fetching scientist publications:', error);
      res.status(500).json({ message: "Failed to fetch scientist publications" });
    }
  });

  app.get('/api/scientists/:id/authorship-stats', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const yearsSince = req.query.years ? parseInt(req.query.years as string) : 5;
      const stats = await storage.getAuthorshipStatsByYear(id, yearsSince);
      
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch authorship statistics" });
    }
  });

  // Sidra Score calculation for all scientists
  app.post('/api/scientists/sidra-scores', async (req: Request, res: Response) => {
    try {
      const { years = 5, impactFactorYear = "publication", multipliers = {} } = req.body;
      
      // Default multipliers
      const defaultMultipliers = {
        'First Author': 2,
        'Last Author': 2,
        'Senior Author': 2,
        'Corresponding Author': 2
      };
      
      const finalMultipliers = { ...defaultMultipliers, ...multipliers };
      
      // Get only scientific staff (exclude administrative staff)
      const allScientists = await storage.getScientists();
      const scientists = allScientists.filter(scientist => scientist.staffType === 'scientific');
      
      // Calculate scores for each scientist
      const rankings = await Promise.all(scientists.map(async (scientist) => {
        let totalScore = 0;
        let publicationsCount = 0;
        let missingImpactFactorPublications: string[] = [];
        let calculationDetails: any[] = [];
        
        try {
          // Get all publications and filter for ones where this scientist is an internal author
          const allPublications = await storage.getPublications();
          const scientistPublications = [];
          
          // First, get all publications where this scientist is an internal author
          for (const publication of allPublications) {
            try {
              const authors = await storage.getPublicationAuthors(publication.id);
              const scientistAuthor = authors.find(author => author.scientistId === scientist.id);
              
              if (scientistAuthor) {
                // Check if publication is within time period
                if (publication.publicationDate) {
                  const pubDate = new Date(publication.publicationDate);
                  const cutoffDate = new Date();
                  cutoffDate.setFullYear(cutoffDate.getFullYear() - years);
                  
                  if (pubDate >= cutoffDate) {
                    scientistPublications.push({
                      ...publication,
                      authorshipType: scientistAuthor.authorshipType
                    });
                  }
                }
              }
            } catch (error) {
              console.error(`Error checking authorship for publication ${publication.id}:`, error);
              continue;
            }
          }
          
          // Now calculate scores for publications where scientist is internal author
          for (const publication of scientistPublications) {
            try {
              // Only count published publications with impact factors
              if (!publication.status || !['Published', 'Published *', 'Accepted/In Press'].includes(publication.status)) {
                continue;
              }
              
              if (!publication.journal || publication.journal.trim() === '') {
                continue;
              }
              
              // Get journal impact factor based on configured year
              const pubYear = publication.publicationDate ? new Date(publication.publicationDate).getFullYear() : new Date().getFullYear();
              
              let targetYear;
              if (impactFactorYear === "prior") {
                targetYear = pubYear - 1;
              } else if (impactFactorYear === "publication") {
                targetYear = pubYear;
              } else { // "latest"
                targetYear = new Date().getFullYear();
              }
              
              let impactFactor;
              let actualYear = targetYear;
              let usedFallback = false;
              
              try {
                console.log(`Looking for impact factor: journal="${publication.journal.trim()}", targetYear=${targetYear}`);
                impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), targetYear);
                
                // If no impact factor found for target year, try fallback years
                if (!impactFactor) {
                  console.log(`No impact factor found for ${publication.journal.trim()} in ${targetYear}, trying fallbacks...`);
                  usedFallback = true;
                  if (impactFactorYear === "latest") {
                    // For latest, try previous years going back from current year
                    for (let fallbackYear = new Date().getFullYear() - 1; fallbackYear >= 2020; fallbackYear--) {
                      impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), fallbackYear);
                      if (impactFactor) {
                        console.log(`Found fallback impact factor for ${publication.journal.trim()} in ${fallbackYear}`);
                        actualYear = fallbackYear;
                        break;
                      }
                    }
                  } else {
                    // For prior/publication year, try adjacent years
                    const fallbackYears = [targetYear + 1, targetYear - 1, targetYear + 2, targetYear - 2];
                    for (const fallbackYear of fallbackYears) {
                      if (fallbackYear >= 2020) {
                        impactFactor = await storage.getImpactFactorByJournalAndYear(publication.journal.trim(), fallbackYear);
                        if (impactFactor) {
                          console.log(`Found fallback impact factor for ${publication.journal.trim()} in ${fallbackYear}`);
                          actualYear = fallbackYear;
                          break;
                        }
                      }
                    }
                  }
                } else {
                  console.log(`Found exact impact factor for ${publication.journal.trim()} in ${targetYear}: ${impactFactor.impactFactor}`);
                }
              } catch (error) {
                console.error(`Error getting impact factor for journal "${publication.journal}" year ${targetYear}:`, error);
                continue;
              }
              
              if (!impactFactor?.impactFactor || isNaN(impactFactor.impactFactor)) {
                // Track publications without impact factors
                missingImpactFactorPublications.push(publication.title);
                continue;
              }
              
              publicationsCount++;
              
              // Parse authorship types and apply multipliers
              const authorshipTypes = publication.authorshipType.split(',').map(type => type.trim());
              let multiplier = 1; // Base multiplier
              let appliedMultipliers: string[] = [];
              
              for (const type of authorshipTypes) {
                if (finalMultipliers[type] && !isNaN(finalMultipliers[type])) {
                  if (finalMultipliers[type] > multiplier) {
                    multiplier = finalMultipliers[type];
                    appliedMultipliers = [type];
                  } else if (finalMultipliers[type] === multiplier && !appliedMultipliers.includes(type)) {
                    appliedMultipliers.push(type);
                  }
                }
              }
              
              const publicationScore = impactFactor.impactFactor * multiplier;
              totalScore += publicationScore;
              
              // Store calculation details
              calculationDetails.push({
                title: publication.title,
                journal: publication.journal,
                publicationDate: publication.publicationDate,
                impactFactor: impactFactor.impactFactor,
                targetYear: targetYear,
                actualYear: actualYear,
                usedFallback: usedFallback,
                authorshipTypes: authorshipTypes,
                appliedMultipliers: appliedMultipliers,
                multiplier: multiplier,
                publicationScore: publicationScore
              });
            } catch (pubError) {
              console.error(`Error processing publication ${publication.id} for scientist ${scientist.id}:`, pubError);
              continue;
            }
          }
        } catch (scientistError) {
          console.error(`Error processing scientist ${scientist.id}:`, scientistError);
        }
        
        return {
          id: scientist.id,
          honorificTitle: scientist.honorificTitle,
          firstName: scientist.firstName,
          lastName: scientist.lastName,
          jobTitle: scientist.jobTitle,
          department: scientist.department,
          publicationsCount,
          sidraScore: totalScore,
          missingImpactFactorPublications,
          calculationDetails
        };
      }));
      
      // Sort by score descending
      rankings.sort((a, b) => b.sidraScore - a.sidraScore);
      
      res.json(rankings);
    } catch (error) {
      console.error('Error calculating Sidra scores:', error);
      res.status(500).json({ message: "Failed to calculate Sidra scores" });
    }
  });

  app.post('/api/scientists', async (req: Request, res: Response) => {
    try {
      const validateData = insertScientistSchema.parse(req.body);
      const scientist = await storage.createScientist(validateData);
      res.status(201).json(scientist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create scientist" });
    }
  });

  app.patch('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const validateData = insertScientistSchema.partial().parse(req.body);
      const scientist = await storage.updateScientist(id, validateData);
      
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      res.json(scientist);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update scientist" });
    }
  });

  app.delete('/api/scientists/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const success = await storage.deleteScientist(id);
      
      if (!success) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete scientist" });
    }
  });

  app.get('/api/staff', async (req: Request, res: Response) => {
    try {
      const staff = await storage.getStaff();
      res.json(staff);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch staff" });
    }
  });

  app.get('/api/principal-investigators', async (req: Request, res: Response) => {
    try {
      const pis = await storage.getPrincipalInvestigators();
      res.json(pis);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch principal investigators" });
    }
  });
  
  // Research Activities
  app.get('/api/research-activities', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const principalInvestigatorId = req.query.principalInvestigatorId ? parseInt(req.query.principalInvestigatorId as string) : undefined;
      
      let activities;
      if (projectId && !isNaN(projectId)) {
        activities = await storage.getResearchActivitiesForProject(projectId);
      } else if (principalInvestigatorId && !isNaN(principalInvestigatorId)) {
        activities = await storage.getResearchActivitiesForScientist(principalInvestigatorId);
      } else {
        activities = await storage.getResearchActivities();
      }
      
      res.json(activities);
    } catch (error) {
      console.error("Error fetching research activities:", error);
      res.status(500).json({ message: "Failed to fetch research activities" });
    }
  });
  
  app.get('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const activity = await storage.getResearchActivity(id);
      if (!activity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      // Get project details if projectId exists
      let project = null;
      if (activity.projectId) {
        project = await storage.getProject(activity.projectId);
      }
      
      // Principal Investigator details now come from team membership
      
      const enhancedActivity = {
        ...activity,
        project: project ? {
          id: project.id,
          name: project.name,
          projectId: project.projectId
        } : null
      };
      
      res.json(enhancedActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research activity" });
    }
  });

  app.get('/api/research-activities/:id/staff', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      // Get all project members for this research activity
      const members = await storage.getProjectMembers(id);
      
      // Get scientist details for each member
      const staffPromises = members.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return scientist;
      });
      
      const staff = await Promise.all(staffPromises);
      // Filter out any null values and return only the staff
      const validStaff = staff.filter(scientist => scientist !== undefined);
      
      res.json(validStaff);
    } catch (error) {
      console.error("Error fetching research activity staff:", error);
      res.status(500).json({ message: "Failed to fetch research activity staff" });
    }
  });

  app.post('/api/research-activities', async (req: Request, res: Response) => {
    try {
      const validatedData = insertResearchActivitySchema.parse(req.body);
      const newActivity = await storage.createResearchActivity(validatedData);
      res.status(201).json(newActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error creating research activity:", error);
      res.status(500).json({ message: "Failed to create research activity" });
    }
  });

  app.put('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const validatedData = insertResearchActivitySchema.partial().parse(req.body);
      const updatedActivity = await storage.updateResearchActivity(id, validatedData);
      
      if (!updatedActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      res.json(updatedActivity);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Error updating research activity:", error);
      res.status(500).json({ message: "Failed to update research activity" });
    }
  });

  app.delete('/api/research-activities/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      await storage.deleteResearchActivity(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting research activity:", error);
      res.status(500).json({ message: "Failed to delete research activity" });
    }
  });

  // Projects
  app.get('/api/projects', async (req: Request, res: Response) => {
    try {
      const scientistId = req.query.scientistId ? parseInt(req.query.scientistId as string) : undefined;
      
      let projects;
      if (scientistId && !isNaN(scientistId)) {
        projects = await storage.getProjectsForScientist(scientistId);
      } else {
        projects = await storage.getProjects();
      }
      
      // Enhance projects with lead scientist details
      const enhancedProjects = await Promise.all(projects.map(async (project) => {
        const leadScientist = await storage.getScientist(project.principalInvestigatorId);
        return {
          ...project,
          leadScientist: leadScientist ? {
            id: leadScientist.id,
            name: leadScientist.name,
            profileImageInitials: leadScientist.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedProjects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get lead scientist
      const leadScientist = await storage.getScientist(project.leadScientistId);
      
      // Get team members
      const teamMembers = await storage.getProjectMembers(id);
      const enhancedTeamMembers = await Promise.all(teamMembers.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return {
          ...member,
          scientist: scientist ? {
            id: scientist.id,
            name: scientist.name,
            title: scientist.title,
            profileImageInitials: scientist.profileImageInitials
          } : null
        };
      }));

      const enhancedProject = {
        ...project,
        leadScientist: leadScientist ? {
          id: leadScientist.id,
          name: leadScientist.name,
          title: leadScientist.title,
          profileImageInitials: leadScientist.profileImageInitials
        } : null,
        teamMembers: enhancedTeamMembers
      };

      res.json(enhancedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', async (req: Request, res: Response) => {
    try {
      const validateData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validateData);
      
      // Automatically add lead scientist as a team member
      await storage.addProjectMember({
        projectId: project.id,
        scientistId: project.leadScientistId,
        role: "Principal Investigator"
      });
      
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const validateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validateData);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete('/api/projects/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const success = await storage.deleteProject(id);
      
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Project Research Activities
  app.get('/api/projects/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }
      
      const activities = await storage.getResearchActivitiesForProject(id);
      
      // Directly return activities without enhancement for now
      res.json(activities);
    } catch (error) {
      console.error("Error fetching research activities for project:", error);
      res.status(500).json({ message: "Failed to fetch research activities for project" });
    }
  });

  // Project Members
  app.get('/api/projects/:id/members', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Get project's research activities
      const activities = await storage.getResearchActivitiesForProject(id);
      
      if (activities.length === 0) {
        return res.json([]);
      }
      
      // Get members for each research activity
      const allMembers = [];
      for (const activity of activities) {
        const members = await storage.getProjectMembers(activity.id);
        
        // Enhance team members with scientist details
        const enhancedMembers = await Promise.all(members.map(async (member) => {
          const scientist = await storage.getScientist(member.scientistId);
          return {
            ...member,
            researchActivityTitle: activity.title,
            scientist: scientist ? {
              id: scientist.id,
              name: scientist.name,
              title: scientist.title,
              profileImageInitials: scientist.profileImageInitials
            } : null
          };
        }));
        
        allMembers.push(...enhancedMembers);
      }
      
      res.json(allMembers);
    } catch (error) {
      console.error("Error fetching project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  // Get all project members across all projects
  app.get('/api/project-members', async (req: Request, res: Response) => {
    try {
      const allMembers = await storage.getAllProjectMembers();
      res.json(allMembers);
    } catch (error) {
      console.error("Error fetching all project members:", error);
      res.status(500).json({ message: "Failed to fetch project members" });
    }
  });

  app.post('/api/projects/:id/members', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      // Need to select a research activity for this project
      const { researchActivityId, scientistId, role } = req.body;
      
      if (!researchActivityId) {
        return res.status(400).json({ message: "Research activity ID is required" });
      }
      
      // Validate that the research activity belongs to this project
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      if (researchActivity.projectId !== projectId) {
        return res.status(400).json({ message: "Research activity does not belong to this project" });
      }
      
      const validateData = insertProjectMemberSchema.parse({
        researchActivityId,
        scientistId,
        role
      });
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
            
      const member = await storage.addProjectMember(validateData);
      
      // Return enhanced member with scientist details
      const enhancedMember = {
        ...member,
        researchActivityTitle: researchActivity.title,
        scientist: {
          id: scientist.id,
          name: scientist.name,
          title: scientist.title,
          profileImageInitials: scientist.profileImageInitials
        }
      };
      
      res.status(201).json(enhancedMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error adding project member:", error);
      res.status(500).json({ message: "Failed to add project member" });
    }
  });

  app.delete('/api/projects/:projectId/members/:scientistId', async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const scientistId = parseInt(req.params.scientistId);
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      if (isNaN(projectId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      if (!researchActivityId) {
        return res.status(400).json({ message: "Research activity ID is required" });
      }
      
      // Validate that the research activity belongs to this project
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      if (researchActivity.projectId !== projectId) {
        return res.status(400).json({ message: "Research activity does not belong to this project" });
      }

      // Note: Principal Investigator role is now managed through team membership

      const success = await storage.removeProjectMember(researchActivityId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Project member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing project member:", error);
      res.status(500).json({ message: "Failed to remove project member" });
    }
  });

  // Research Activity Members - Direct access routes
  app.get('/api/research-activities/:id/members', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const members = await storage.getProjectMembers(id);
      
      // Enhance team members with scientist details
      const enhancedMembers = await Promise.all(members.map(async (member) => {
        const scientist = await storage.getScientist(member.scientistId);
        return {
          ...member,
          scientist: scientist ? {
            id: scientist.id,
            name: scientist.name,
            title: scientist.title,
            email: scientist.email,
            staffId: scientist.staffId,
            profileImageInitials: scientist.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedMembers);
    } catch (error) {
      console.error("Error fetching research activity members:", error);
      res.status(500).json({ message: "Failed to fetch research activity members" });
    }
  });

  app.post('/api/research-activities/:id/members', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const { scientistId, role } = req.body;
      
      const validateData = insertProjectMemberSchema.parse({
        researchActivityId,
        scientistId,
        role
      });
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      // Validate role assignment: Only Investigators can be Principal Investigators
      if (validateData.role === "Principal Investigator" && scientist.title !== "Investigator") {
        return res.status(400).json({ 
          message: "Only scientists with the job title 'Investigator' can be assigned the role of Principal Investigator" 
        });
      }
      
      // Check if member already exists
      const existingMembers = await storage.getProjectMembers(researchActivityId);
      const memberExists = existingMembers.some(m => m.scientistId === scientistId);
      if (memberExists) {
        return res.status(400).json({ message: "Scientist is already a member of this research activity" });
      }
      
      // Enforce role constraints: Only 1 Principal Investigator and 1 Lead Scientist per research activity
      const currentRoles = existingMembers.map(m => m.role);
      
      if (validateData.role === "Principal Investigator") {
        const hasPrincipalInvestigator = currentRoles.includes("Principal Investigator");
        if (hasPrincipalInvestigator) {
          return res.status(400).json({ 
            message: "Each research activity can only have one Principal Investigator" 
          });
        }
      }
      
      if (validateData.role === "Lead Scientist") {
        const hasLeadScientist = currentRoles.includes("Lead Scientist");
        if (hasLeadScientist) {
          return res.status(400).json({ 
            message: "Each research activity can only have one Lead Scientist" 
          });
        }
      }
            
      const member = await storage.addProjectMember(validateData);
      
      // Return enhanced member with scientist details
      const enhancedMember = {
        ...member,
        scientist: {
          id: scientist.id,
          name: scientist.name,
          title: scientist.title,
          email: scientist.email,
          staffId: scientist.staffId,
          profileImageInitials: scientist.profileImageInitials
        }
      };
      
      res.status(201).json(enhancedMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error("Error adding research activity member:", error);
      res.status(500).json({ message: "Failed to add research activity member" });
    }
  });

  app.delete('/api/research-activities/:id/members/:scientistId', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      const scientistId = parseInt(req.params.scientistId);
      
      if (isNaN(researchActivityId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid ID parameters" });
      }
      
      // Note: Principal Investigator role is now managed through team membership

      const success = await storage.removeProjectMember(researchActivityId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Research activity member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing research activity member:", error);
      res.status(500).json({ message: "Failed to remove research activity member" });
    }
  });

  // Data Management Plans
  app.get('/api/data-management-plans', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let plans;
      if (projectId && !isNaN(projectId)) {
        const plan = await storage.getDataManagementPlanForProject(projectId);
        plans = plan ? [plan] : [];
      } else {
        plans = await storage.getDataManagementPlans();
      }
      
      // Enhance plans with project details
      const enhancedPlans = await Promise.all(plans.map(async (plan) => {
        const project = await storage.getProject(plan.projectId);
        return {
          ...plan,
          project: project ? {
            id: project.id,
            title: project.title
          } : null
        };
      }));
      
      res.json(enhancedPlans);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data management plans" });
    }
  });

  app.get('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const plan = await storage.getDataManagementPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Data management plan not found" });
      }

      // Get project details
      const project = await storage.getProject(plan.projectId);
      
      const enhancedPlan = {
        ...plan,
        project: project ? {
          id: project.id,
          title: project.title
        } : null
      };

      res.json(enhancedPlan);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch data management plan" });
    }
  });

  app.post('/api/data-management-plans', async (req: Request, res: Response) => {
    try {
      const validateData = insertDataManagementPlanSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if a plan already exists for this project
      const existingPlan = await storage.getDataManagementPlanForProject(validateData.projectId);
      if (existingPlan) {
        return res.status(409).json({ message: "A data management plan already exists for this project" });
      }
      
      const plan = await storage.createDataManagementPlan(validateData);
      res.status(201).json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create data management plan" });
    }
  });

  app.patch('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const validateData = insertDataManagementPlanSchema.partial().parse(req.body);
      const plan = await storage.updateDataManagementPlan(id, validateData);
      
      if (!plan) {
        return res.status(404).json({ message: "Data management plan not found" });
      }
      
      res.json(plan);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update data management plan" });
    }
  });

  app.delete('/api/data-management-plans/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid data management plan ID" });
      }

      const success = await storage.deleteDataManagementPlan(id);
      
      if (!success) {
        return res.status(404).json({ message: "Data management plan not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete data management plan" });
    }
  });

  // Publications
  app.get('/api/publications', async (req: Request, res: Response) => {
    try {
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      let publications;
      if (researchActivityId && !isNaN(researchActivityId)) {
        publications = await storage.getPublicationsForResearchActivity(researchActivityId);
      } else {
        publications = await storage.getPublications();
      }
      
      // Enhance publications with research activity details
      const enhancedPublications = await Promise.all(publications.map(async (pub) => {
        const researchActivity = pub.researchActivityId ? await storage.getResearchActivity(pub.researchActivityId) : null;
        return {
          ...pub,
          researchActivity: researchActivity ? {
            id: researchActivity.id,
            sdrNumber: researchActivity.sdrNumber,
            title: researchActivity.title
          } : null
        };
      }));
      
      res.json(enhancedPublications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publications" });
    }
  });

  app.get('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const publication = await storage.getPublication(id);
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }

      // Get research activity details
      const researchActivity = publication.researchActivityId ? await storage.getResearchActivity(publication.researchActivityId) : null;
      
      const enhancedPublication = {
        ...publication,
        researchActivity: researchActivity ? {
          id: researchActivity.id,
          sdrNumber: researchActivity.sdrNumber,
          title: researchActivity.title
        } : null
      };

      res.json(enhancedPublication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch publication" });
    }
  });

  app.post('/api/publications', async (req: Request, res: Response) => {
    try {
      // Create a validation schema that makes authors optional for concept status
      const createPublicationSchema = insertPublicationSchema.extend({
        authors: z.string().optional().nullable(),
      });
      
      const validateData = createPublicationSchema.parse(req.body);
      
      // Set default status to "Concept" if not provided
      const publicationData = {
        ...validateData,
        status: validateData.status || "Concept"
      };
      
      // Check if research activity exists if researchActivityId is provided
      if (publicationData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(publicationData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
        }
      }
      
      const publication = await storage.createPublication(publicationData);
      
      // Create initial history entry for publication creation
      await storage.createManuscriptHistoryEntry({
        publicationId: publication.id,
        fromStatus: '',
        toStatus: publication.status || 'Concept',
        changedBy: 1, // Default user - could be enhanced with actual session user
        changeReason: 'Publication created',
      });
      
      res.status(201).json(publication);
    } catch (error) {
      console.error("Publication creation error:", error);
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create publication", error: error.message });
    }
  });

  app.patch('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const validateData = insertPublicationSchema.partial().parse(req.body);
      
      // Check if research activity exists if researchActivityId is provided
      if (validateData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
        }
      }
      
      const publication = await storage.updatePublication(id, validateData);
      
      if (!publication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(publication);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update publication" });
    }
  });

  app.delete('/api/publications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const success = await storage.deletePublication(id);
      
      if (!success) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete publication" });
    }
  });

  // Manuscript History
  app.get('/api/publications/:id/history', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const history = await storage.getManuscriptHistory(id);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manuscript history" });
    }
  });

  // Publication Status Management
  app.patch('/api/publications/:id/status', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const { status, changedBy, changes, updatedFields } = req.body;
      
      if (!status || !changedBy) {
        return res.status(400).json({ message: "Status and changedBy are required" });
      }

      // Validate status transition
      const currentPublication = await storage.getPublication(id);
      
      if (!currentPublication) {
        return res.status(404).json({ message: "Publication not found" });
      }

      // Status validation logic
      const validTransitions = {
        'Concept': ['Complete Draft'],
        'Complete Draft': ['Vetted for submission'],
        'Vetted for submission': ['Submitted for review with pre-publication', 'Submitted for review without pre-publication'],
        'Submitted for review with pre-publication': ['Under review'],
        'Submitted for review without pre-publication': ['Under review'],
        'Under review': ['Accepted/In Press'],
        'Accepted/In Press': ['Published']
      };

      const currentStatus = currentPublication.status || 'Concept';
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status transition from "${currentStatus}" to "${status}"` 
        });
      }

      // Field validation based on status
      const validationErrors = [];
      
      if (status === 'Complete Draft') {
        const finalAuthors = updatedFields?.authors || currentPublication.authors;
        if (!finalAuthors || finalAuthors.trim() === '') {
          validationErrors.push('Authorship field is required for Complete Draft status');
        }
      }
      
      if (status === 'Vetted for submission' && !currentPublication.vettedForSubmissionByIpOffice) {
        validationErrors.push('IP office approval is required for Vetted for submission status. Please update this in the publication edit form.');
      }
      
      if (status === 'Submitted for review with pre-publication') {
        const finalUrl = (updatedFields?.prepublicationUrl?.trim() || currentPublication.prepublicationUrl?.trim()) || '';
        const finalSite = (updatedFields?.prepublicationSite?.trim() || currentPublication.prepublicationSite?.trim()) || '';
        if (!finalUrl || !finalSite) {
          validationErrors.push('Prepublication URL and site are required for pre-publication submission');
        }
      }
      
      if (['Under review', 'Accepted/In Press'].includes(status)) {
        const finalJournal = updatedFields?.journal || currentPublication.journal;
        if (!finalJournal || finalJournal.trim() === '') {
          validationErrors.push('Journal name is required for this status');
        }
      }
      
      if (status === 'Published') {
        const finalDate = updatedFields?.publicationDate || currentPublication.publicationDate;
        const finalDoi = updatedFields?.doi || currentPublication.doi;
        if (!finalDate || !finalDoi) {
          validationErrors.push('Publication date and DOI are required for Published status');
        }
      }

      if (validationErrors.length > 0) {
        return res.status(400).json({ message: validationErrors.join('; ') });
      }

      // First update publication fields if provided
      if (updatedFields && Object.keys(updatedFields).length > 0) {
        await storage.updatePublication(id, updatedFields);
      }

      // Then update status and create history
      const updatedPublication = await storage.updatePublicationStatus(id, status, changedBy, changes);
      
      if (!updatedPublication) {
        return res.status(404).json({ message: "Publication not found" });
      }
      
      res.json(updatedPublication);
    } catch (error) {
      console.error('Error updating publication status:', error);
      res.status(500).json({ message: "Failed to update publication status" });
    }
  });

  // Publication Authors
  app.get('/api/publications/:id/authors', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.id);
      if (isNaN(publicationId)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const authors = await storage.getPublicationAuthors(publicationId);
      res.json(authors);
    } catch (error) {
      console.error("Error fetching publication authors:", error);
      res.status(500).json({ message: "Failed to fetch publication authors", error: error.message });
    }
  });

  app.post('/api/publications/:id/authors', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.id);
      if (isNaN(publicationId)) {
        return res.status(400).json({ message: "Invalid publication ID" });
      }

      const validateData = insertPublicationAuthorSchema.parse({
        ...req.body,
        publicationId
      });

      // Check if scientist is already an author
      const existingAuthors = await storage.getPublicationAuthors(publicationId);
      const existingAuthor = existingAuthors.find(author => author.scientistId === validateData.scientistId);

      if (existingAuthor) {
        // Update existing author by combining authorship types
        const existingTypes = existingAuthor.authorshipType.split(',').map(t => t.trim());
        const newTypes = validateData.authorshipType.split(',').map(t => t.trim());
        
        // Combine types, avoiding duplicates
        const combinedTypes = [...new Set([...existingTypes, ...newTypes])];
        
        const updatedAuthor = await storage.updatePublicationAuthor(
          publicationId,
          validateData.scientistId,
          {
            authorshipType: combinedTypes.join(', '),
            authorPosition: validateData.authorPosition || existingAuthor.authorPosition
          }
        );
        res.status(200).json(updatedAuthor);
      } else {
        // Add new author
        const author = await storage.addPublicationAuthor(validateData);
        res.status(201).json(author);
      }
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to add publication author" });
    }
  });

  app.delete('/api/publications/:publicationId/authors/:scientistId', async (req: Request, res: Response) => {
    try {
      const publicationId = parseInt(req.params.publicationId);
      const scientistId = parseInt(req.params.scientistId);
      
      if (isNaN(publicationId) || isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid publication or scientist ID" });
      }

      const success = await storage.removePublicationAuthor(publicationId, scientistId);
      
      if (!success) {
        return res.status(404).json({ message: "Publication author not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove publication author" });
    }
  });

  // Publication Export  
  app.post('/api/publications/export', async (req: Request, res: Response) => {
    try {
      const { startDate, endDate, journal, scientist, status } = req.body;
      
      // Get all publications first
      const allPublications = await storage.getPublications();
      
      // Apply filters
      let filteredPublications = allPublications;
      
      if (startDate || endDate) {
        filteredPublications = filteredPublications.filter(pub => {
          if (!pub.publicationDate) return false;
          const pubDate = new Date(pub.publicationDate);
          if (startDate && pubDate < new Date(startDate)) return false;
          if (endDate && pubDate > new Date(endDate)) return false;
          return true;
        });
      }
      
      if (journal) {
        filteredPublications = filteredPublications.filter(pub => 
          pub.journal?.toLowerCase().includes(journal.toLowerCase())
        );
      }
      
      if (status && status !== 'all') {
        filteredPublications = filteredPublications.filter(pub => 
          pub.status === status
        );
      }
      
      if (scientist) {
        filteredPublications = filteredPublications.filter(pub => 
          pub.authors?.toLowerCase().includes(scientist.toLowerCase())
        );
      }
      
      // Format as text for copy-paste
      const formattedText = filteredPublications.map(pub => {
        const year = pub.publicationDate ? new Date(pub.publicationDate).getFullYear() : 'N/A';
        return `${pub.title}\n${pub.authors || 'No authors listed'}\n${pub.journal || 'No journal'} ${pub.volume ? `${pub.volume}` : ''}${pub.issue ? `(${pub.issue})` : ''}${pub.pages ? `: ${pub.pages}` : ''} (${year})\n${pub.doi ? `DOI: ${pub.doi}` : 'No DOI'}\nStatus: ${pub.status || 'Unknown'}\n\n---\n\n`;
      }).join('');
      
      res.json({ 
        count: filteredPublications.length,
        formattedText,
        publications: filteredPublications
      });
    } catch (error) {
      console.error('Error exporting publications:', error);
      res.status(500).json({ message: "Failed to export publications" });
    }
  });

  // Patents
  app.get('/api/patents', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let patents;
      if (projectId && !isNaN(projectId)) {
        patents = await storage.getPatentsForProject(projectId);
      } else {
        patents = await storage.getPatents();
      }
      
      // Enhance patents with project details
      const enhancedPatents = await Promise.all(patents.map(async (patent) => {
        const project = patent.projectId ? await storage.getProject(patent.projectId) : null;
        return {
          ...patent,
          project: project ? {
            id: project.id,
            title: project.title
          } : null
        };
      }));
      
      res.json(enhancedPatents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patents" });
    }
  });

  app.get('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const patent = await storage.getPatent(id);
      if (!patent) {
        return res.status(404).json({ message: "Patent not found" });
      }

      // Get project details
      const project = patent.projectId ? await storage.getProject(patent.projectId) : null;
      
      const enhancedPatent = {
        ...patent,
        project: project ? {
          id: project.id,
          title: project.title
        } : null
      };

      res.json(enhancedPatent);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch patent" });
    }
  });

  app.post('/api/patents', async (req: Request, res: Response) => {
    try {
      const validateData = insertPatentSchema.parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const patent = await storage.createPatent(validateData);
      res.status(201).json(patent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create patent" });
    }
  });

  app.patch('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const validateData = insertPatentSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      const patent = await storage.updatePatent(id, validateData);
      
      if (!patent) {
        return res.status(404).json({ message: "Patent not found" });
      }
      
      res.json(patent);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update patent" });
    }
  });

  app.delete('/api/patents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid patent ID" });
      }

      const success = await storage.deletePatent(id);
      
      if (!success) {
        return res.status(404).json({ message: "Patent not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete patent" });
    }
  });

  // IRB Applications
  app.get('/api/irb-applications', async (req: Request, res: Response) => {
    try {
      const researchActivityId = req.query.researchActivityId ? parseInt(req.query.researchActivityId as string) : undefined;
      
      let applications;
      if (researchActivityId && !isNaN(researchActivityId)) {
        applications = await storage.getIrbApplicationsForResearchActivity(researchActivityId);
      } else {
        applications = await storage.getIrbApplications();
      }
      
      // Enhance applications with research activity and PI details
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const researchActivity = app.researchActivityId ? await storage.getResearchActivity(app.researchActivityId) : null;
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          researchActivity: researchActivity ? {
            id: researchActivity.id,
            sdrNumber: researchActivity.sdrNumber,
            title: researchActivity.title
          } : null,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedApplications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IRB applications" });
    }
  });

  app.get('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      const application = await storage.getIrbApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IRB application not found" });
      }

      // Get related details
      const project = await storage.getProject(application.projectId);
      const pi = await storage.getScientist(application.principalInvestigatorId);
      
      const enhancedApplication = {
        ...application,
        project: project ? {
          id: project.id,
          title: project.title
        } : null,
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IRB application" });
    }
  });

  app.post('/api/irb-applications', async (req: Request, res: Response) => {
    try {
      // Generate IRB number automatically - simple increment approach
      const currentYear = new Date().getFullYear();
      const existingApps = await storage.getIrbApplications();
      const yearlyApps = existingApps.filter(app => 
        app.irbNumber && app.irbNumber.startsWith(`IRB-${currentYear}-`)
      );
      
      // Get the highest existing number and add 1
      const existingNumbers = yearlyApps
        .map(app => {
          const match = app.irbNumber?.match(/IRB-\d{4}-(\d{3})/);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0);
      
      const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
      const nextNumber = maxNumber + 1;
      const irbNumber = `IRB-${currentYear}-${nextNumber.toString().padStart(3, '0')}`;
      
      const validateData = {
        ...req.body,
        irbNumber,
        workflowStatus: req.body.workflowStatus || 'draft',
        status: 'Active', // Required field for database
      };
      
      // Check if research activity exists
      const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }
      
      // Check if principal investigator exists
      const pi = await storage.getScientist(validateData.principalInvestigatorId);
      if (!pi) {
        return res.status(404).json({ message: "Principal investigator not found" });
      }
      
      const application = await storage.createIrbApplication(validateData);
      res.status(201).json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('IRB application creation error:', error);
      res.status(500).json({ message: "Failed to create IRB application" });
    }
  });

  app.patch('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      console.log('Updating IRB application with data:', req.body);

      // Handle submission comments separately
      if (req.body.submissionComment) {
        const currentApp = await storage.getIrbApplication(id);
        if (currentApp) {
          let existingResponses = {};
          
          // Handle both string and object formats for piResponses
          if (currentApp.piResponses) {
            if (typeof currentApp.piResponses === 'string') {
              try {
                existingResponses = JSON.parse(currentApp.piResponses);
              } catch (e) {
                console.error('Error parsing existing PI responses:', e);
                existingResponses = {};
              }
            } else if (typeof currentApp.piResponses === 'object') {
              existingResponses = currentApp.piResponses;
            }
          }
          
          const newResponse = {
            timestamp: new Date().toISOString(),
            comment: req.body.submissionComment,
            workflowStatus: req.body.workflowStatus || 'resubmitted'
          };
          existingResponses[Date.now()] = newResponse;
          req.body.piResponses = JSON.stringify(existingResponses);
          delete req.body.submissionComment; // Remove from body to avoid validation issues
        }
      }

      // Skip validation for protocol team members updates and documents updates
      let validateData = req.body;
      
      // Always convert date strings to Date objects if present
      if (req.body.submissionDate && typeof req.body.submissionDate === 'string') {
        req.body.submissionDate = new Date(req.body.submissionDate);
      }
      if (req.body.initialApprovalDate && typeof req.body.initialApprovalDate === 'string') {
        req.body.initialApprovalDate = new Date(req.body.initialApprovalDate);
      }
      if (req.body.expirationDate && typeof req.body.expirationDate === 'string') {
        req.body.expirationDate = new Date(req.body.expirationDate);
      }
      
      if (!req.body.protocolTeamMembers && !req.body.documents && !req.body.piResponses) {
        validateData = insertIrbApplicationSchema.partial().parse(req.body);
      }
      
      // Check if research activity exists if researchActivityId is provided
      if (validateData.researchActivityId) {
        const researchActivity = await storage.getResearchActivity(validateData.researchActivityId);
        if (!researchActivity) {
          return res.status(404).json({ message: "Research activity not found" });
        }
      }
      
      // Check if principal investigator exists if principalInvestigatorId is provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const application = await storage.updateIrbApplication(id, validateData);
      
      if (!application) {
        return res.status(404).json({ message: "IRB application not found" });
      }
      
      res.json(application);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation error:', error);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('IRB application update error:', error);
      res.status(500).json({ message: "Failed to update IRB application", error: error.message });
    }
  });

  app.delete('/api/irb-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IRB application ID" });
      }

      const success = await storage.deleteIrbApplication(id);
      
      if (!success) {
        return res.status(404).json({ message: "IRB application not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IRB application" });
    }
  });

  // IBC Applications
  app.get('/api/ibc-applications', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      // IBC applications are not directly linked to projects, so ignore projectId filter
      const applications = await storage.getIbcApplications();
      
      // Enhance applications with PI details (IBC applications are not directly linked to projects)
      const enhancedApplications = await Promise.all(applications.map(async (app) => {
        const pi = await storage.getScientist(app.principalInvestigatorId);
        
        return {
          ...app,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedApplications);
    } catch (error) {
      console.error('Error fetching IBC applications:', error);
      res.status(500).json({ message: "Failed to fetch IBC applications" });
    }
  });

  app.get('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get related research activities (SDRs)
      const researchActivities = await storage.getResearchActivitiesForIbcApplication(id);
      const pi = await storage.getScientist(application.principalInvestigatorId);
      
      const enhancedApplication = {
        ...application,
        researchActivities: researchActivities.map(activity => ({
          id: activity.id,
          sdrNumber: activity.sdrNumber,
          title: activity.title,
          status: activity.status
        })),
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedApplication);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC application" });
    }
  });

  app.post('/api/ibc-applications', async (req: Request, res: Response) => {
    try {
      console.log("=== IBC Application Creation Debug ===");
      console.log("Full request body:", JSON.stringify(req.body, null, 2));
      
      const { researchActivityIds, isDraft, ...applicationData } = req.body;
      console.log("Extracted researchActivityIds:", researchActivityIds);
      console.log("Is draft:", isDraft);
      console.log("Application data after extraction:", JSON.stringify(applicationData, null, 2));
      
      console.log("Adding auto-generated fields...");
      // Add auto-generated fields before validation
      const dataWithAutoFields = {
        ...applicationData,
        ibcNumber: applicationData.ibcNumber || await storage.generateNextIbcNumber(),
        status: isDraft ? "Draft" : (applicationData.status || "Submitted"),
        workflowStatus: isDraft ? "draft" : (applicationData.workflowStatus || "submitted"),
        riskLevel: applicationData.riskLevel || "moderate"
      };
      console.log("Data with auto-generated fields:", JSON.stringify(dataWithAutoFields, null, 2));
      
      console.log("Validating with schema...");
      const validateData = insertIbcApplicationSchema.parse(dataWithAutoFields);
      console.log("Schema validation successful:", JSON.stringify(validateData, null, 2));
      
      // Check if principal investigator exists
      console.log("Checking principal investigator with ID:", validateData.principalInvestigatorId);
      const pi = await storage.getScientist(validateData.principalInvestigatorId);
      if (!pi) {
        console.log("Principal investigator not found");
        return res.status(404).json({ message: "Principal investigator not found" });
      }
      console.log("Principal investigator found:", pi.name);
      
      // Validate research activities if provided
      if (researchActivityIds && Array.isArray(researchActivityIds)) {
        console.log("Validating research activities:", researchActivityIds);
        for (const activityId of researchActivityIds) {
          const activity = await storage.getResearchActivity(activityId);
          if (!activity) {
            console.log(`Research activity with ID ${activityId} not found`);
            return res.status(404).json({ message: `Research activity with ID ${activityId} not found` });
          }
          console.log(`Research activity ${activityId} found:`, activity.title);
        }
      }
      
      console.log("Creating IBC application...");
      const application = await storage.createIbcApplication(validateData, researchActivityIds || []);
      console.log("IBC application created successfully:", application.id);
      
      res.status(201).json(application);
    } catch (error) {
      console.error("Error creating IBC application:", error);
      if (error instanceof ZodError) {
        console.log("Zod validation error:", fromZodError(error).message);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.log("Generic error:", error.message);
      res.status(500).json({ message: "Failed to create IBC application", error: error.message });
    }
  });

  app.patch('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      console.log('PATCH /api/ibc-applications/:id called');
      console.log('Request params:', req.params);
      console.log('Request body:', req.body);
      
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      // Extract isDraft flag and remove it from validation data
      const { isDraft, ...bodyData } = req.body;
      console.log('isDraft:', isDraft);
      console.log('bodyData:', bodyData);
      
      const validateData = insertIbcApplicationSchema.partial().parse(bodyData);
      console.log('Validated data after schema parsing:', validateData);
      
      // Handle status based on isDraft flag
      if (isDraft !== undefined) {
        if (isDraft) {
          validateData.status = 'draft';
        } else {
          validateData.status = 'submitted';
          // Set submission date when submitting
          if (!validateData.submissionDate) {
            validateData.submissionDate = new Date();
          }
        }
        console.log('Status set to:', validateData.status);
        console.log('Submission date set to:', validateData.submissionDate);
      }
      
      // Handle status changes for timeline tracking
      if (validateData.status) {
        const currentTime = new Date();
        
        // Set vetted date when moving to vetted status
        if (validateData.status === 'vetted' && !validateData.vettedDate) {
          validateData.vettedDate = currentTime;
        }
        
        // Set under review date when moving to under_review status
        if (validateData.status === 'under_review' && !validateData.underReviewDate) {
          validateData.underReviewDate = currentTime;
        }
        
        // Set approval date when moving to active status
        if (validateData.status === 'active' && !validateData.approvalDate) {
          validateData.approvalDate = currentTime;
        }
      }
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      // Get the current application for status change tracking
      const currentApplication = await storage.getIbcApplication(id);
      if (!currentApplication) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      console.log('About to call storage.updateIbcApplication with:', id, validateData);
      const application = await storage.updateIbcApplication(id, validateData);
      console.log('storage.updateIbcApplication result:', application);
      
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Create office comment if reviewComments are provided
      if (req.body.reviewComments) {
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'office_comment',
          authorType: 'office',
          authorName: 'IBC Office',
          comment: req.body.reviewComments,
          isInternal: false
        });
      }

      // Create status change comment if status changed
      if (validateData.status && validateData.status !== currentApplication.status) {
        const statusLabels = {
          'draft': 'Draft',
          'submitted': 'Submitted',
          'vetted': 'Vetted',
          'under_review': 'Under Review',
          'active': 'Active',
          'expired': 'Expired'
        };
        
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'status_change',
          authorType: 'system',
          authorName: 'System',
          comment: `Status changed from ${statusLabels[currentApplication.status] || currentApplication.status} to ${statusLabels[validateData.status] || validateData.status}`,
          statusFrom: currentApplication.status,
          statusTo: validateData.status,
          isInternal: false
        });
      }
      
      res.json(application);
    } catch (error) {
      console.error('Error in PATCH /api/ibc-applications/:id:', error);
      if (error instanceof ZodError) {
        console.error('Zod validation error details:', fromZodError(error).message);
        return res.status(400).json({ message: fromZodError(error).message });
      }
      console.error('Non-Zod error:', error);
      res.status(500).json({ message: "Failed to update IBC application", error: error.message });
    }
  });

  app.delete('/api/ibc-applications/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const success = await storage.deleteIbcApplication(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC application not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC application" });
    }
  });

  // Get research activities for an IBC application
  app.get('/api/ibc-applications/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const researchActivities = await storage.getResearchActivitiesForIbcApplication(id);
      res.json(researchActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research activities for IBC application" });
    }
  });

  // Get personnel data for an IBC application
  app.get('/api/ibc-applications/:id/personnel', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get personnel from the application's protocolTeamMembers field if it exists
      if (application.protocolTeamMembers && Array.isArray(application.protocolTeamMembers)) {
        // Enhance personnel data with scientist details
        const enhancedPersonnel = await Promise.all(
          application.protocolTeamMembers.map(async (person: any) => {
            if (person.scientistId) {
              const scientist = await storage.getScientist(person.scientistId);
              return {
                ...person,
                scientist: scientist ? {
                  id: scientist.id,
                  name: scientist.name,
                  email: scientist.email,
                  department: scientist.department,
                  title: scientist.title,
                  profileImageInitials: scientist.profileImageInitials
                } : null
              };
            }
            return person;
          })
        );
        
        res.json(enhancedPersonnel);
      } else {
        res.json([]);
      }
    } catch (error) {
      console.error("Error fetching IBC application personnel:", error);
      res.status(500).json({ message: "Failed to fetch personnel for IBC application" });
    }
  });

  // Add research activity to IBC application
  app.post('/api/ibc-applications/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const ibcApplicationId = parseInt(req.params.id);
      const { researchActivityId } = req.body;

      if (isNaN(ibcApplicationId)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      if (!researchActivityId || isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Valid research activity ID is required" });
      }

      // Check if IBC application exists
      const ibcApplication = await storage.getIbcApplication(ibcApplicationId);
      if (!ibcApplication) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Check if research activity exists
      const researchActivity = await storage.getResearchActivity(researchActivityId);
      if (!researchActivity) {
        return res.status(404).json({ message: "Research activity not found" });
      }

      const linkage = await storage.addResearchActivityToIbcApplication(ibcApplicationId, researchActivityId);
      res.status(201).json(linkage);
    } catch (error) {
      res.status(500).json({ message: "Failed to add research activity to IBC application" });
    }
  });

  // Remove research activity from IBC application
  app.delete('/api/ibc-applications/:id/research-activities/:activityId', async (req: Request, res: Response) => {
    try {
      const ibcApplicationId = parseInt(req.params.id);
      const researchActivityId = parseInt(req.params.activityId);

      if (isNaN(ibcApplicationId)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const success = await storage.removeResearchActivityFromIbcApplication(ibcApplicationId, researchActivityId);
      
      if (!success) {
        return res.status(404).json({ message: "Research activity not linked to this IBC application" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove research activity from IBC application" });
    }
  });

  // Submit reviewer feedback for IBC application
  app.post('/api/ibc-applications/:id/reviewer-feedback', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const { comments, recommendation } = req.body;
      
      if (!comments || !recommendation) {
        return res.status(400).json({ message: "Comments and recommendation are required" });
      }

      // Get the current application
      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Create the reviewer feedback comment in the comments table
      await storage.createIbcApplicationComment({
        applicationId: id,
        commentType: 'reviewer_feedback',
        authorType: 'reviewer',
        authorName: 'IBC Reviewer',
        comment: comments,
        recommendation: recommendation,
        isInternal: false
      });

      // Update status based on recommendation
      let newStatus = application.status;
      let statusChangeComment = '';
      
      if (recommendation === 'approve') {
        newStatus = 'active';
        statusChangeComment = 'Application approved by reviewer';
      } else if (recommendation === 'reject') {
        newStatus = 'expired';
        statusChangeComment = 'Application rejected by reviewer';
      } else if (recommendation === 'minor_revisions' || recommendation === 'major_revisions') {
        newStatus = 'vetted'; // Return to office for revision handling
        statusChangeComment = `Application returned to office for ${recommendation.replace('_', ' ')}`;
      } else {
        newStatus = 'under_review'; // Stay under review for other cases
        statusChangeComment = 'Application remains under review';
      }

      // Create status change comment if status changed
      if (newStatus !== application.status) {
        await storage.createIbcApplicationComment({
          applicationId: id,
          commentType: 'status_change',
          authorType: 'system',
          authorName: 'System',
          comment: statusChangeComment,
          statusFrom: application.status,
          statusTo: newStatus,
          isInternal: false
        });
      }

      const updatedApplication = await storage.updateIbcApplication(id, {
        status: newStatus,
        workflowStatus: newStatus, // Keep workflow status in sync with status
        underReviewDate: newStatus === 'under_review' ? new Date() : application.underReviewDate,
        approvalDate: newStatus === 'active' ? new Date() : application.approvalDate,
        vettedDate: newStatus === 'vetted' ? new Date() : application.vettedDate,
      });

      res.json({ 
        message: "Review submitted successfully",
        application: updatedApplication 
      });
    } catch (error) {
      console.error("Error submitting reviewer feedback:", error);
      res.status(500).json({ message: "Failed to submit reviewer feedback" });
    }
  });

  // Get comments for IBC application
  app.get('/api/ibc-applications/:id/comments', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const comments = await storage.getIbcApplicationComments(id);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching IBC application comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Submit PI comment for IBC application
  app.post('/api/ibc-applications/:id/pi-comment', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC application ID" });
      }

      const { comment } = req.body;
      
      if (!comment || !comment.trim()) {
        return res.status(400).json({ message: "Comment is required" });
      }

      // Get the current application to get PI info
      const application = await storage.getIbcApplication(id);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }

      // Get PI details for the comment
      const pi = await storage.getScientist(application.principalInvestigatorId);
      const piName = pi ? pi.name : 'Principal Investigator';

      // Create the PI comment in the comments table
      await storage.createIbcApplicationComment({
        applicationId: id,
        commentType: 'pi_response',
        authorType: 'pi',
        authorName: piName,
        authorId: application.principalInvestigatorId,
        comment: comment.trim(),
        isInternal: false
      });

      res.json({ 
        message: "Comment submitted successfully"
      });
    } catch (error) {
      console.error("Error submitting PI comment:", error);
      res.status(500).json({ message: "Failed to submit comment" });
    }
  });

  // IBC Application Facilities Routes
  
  // Get rooms for IBC application
  app.get('/api/ibc-applications/:id/rooms', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const rooms = await storage.getIbcApplicationRooms(id);
      res.json(rooms);
    } catch (error) {
      console.error('Error getting IBC application rooms:', error);
      res.status(500).json({ message: "Failed to fetch IBC application rooms" });
    }
  });

  // Add room to IBC application
  app.post('/api/ibc-applications/:id/rooms', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcApplicationRoomSchema.parse({
        ...req.body,
        applicationId
      });
      const newRoom = await storage.addRoomToIbcApplication(validatedData);
      res.status(201).json(newRoom);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding room to IBC application:', error);
        res.status(500).json({ message: "Failed to add room to IBC application" });
      }
    }
  });

  // Remove room from IBC application
  app.delete('/api/ibc-applications/:id/rooms/:roomId', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const roomId = parseInt(req.params.roomId);
      const success = await storage.removeRoomFromIbcApplication(applicationId, roomId);
      if (success) {
        res.json({ message: "Room removed from IBC application successfully" });
      } else {
        res.status(404).json({ message: "Room not found in IBC application" });
      }
    } catch (error) {
      console.error('Error removing room from IBC application:', error);
      res.status(500).json({ message: "Failed to remove room from IBC application" });
    }
  });

  // Get backbone source room assignments for IBC application
  app.get('/api/ibc-applications/:id/backbone-source-rooms', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const assignments = await storage.getIbcBackboneSourceRooms(id);
      res.json(assignments);
    } catch (error) {
      console.error('Error getting IBC backbone source rooms:', error);
      res.status(500).json({ message: "Failed to fetch IBC backbone source rooms" });
    }
  });

  // Add backbone source room assignment
  app.post('/api/ibc-applications/:id/backbone-source-rooms', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcBackboneSourceRoomSchema.parse({
        ...req.body,
        applicationId
      });
      const newAssignment = await storage.addBackboneSourceRoom(validatedData);
      res.status(201).json(newAssignment);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding backbone source room:', error);
        res.status(500).json({ message: "Failed to add backbone source room assignment" });
      }
    }
  });

  // Remove backbone source room assignment
  app.delete('/api/ibc-applications/:id/backbone-source-rooms/:backboneSource/:roomId', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const backboneSource = req.params.backboneSource;
      const roomId = parseInt(req.params.roomId);
      const success = await storage.removeBackboneSourceRoom(applicationId, backboneSource, roomId);
      if (success) {
        res.json({ message: "Backbone source room assignment removed successfully" });
      } else {
        res.status(404).json({ message: "Backbone source room assignment not found" });
      }
    } catch (error) {
      console.error('Error removing backbone source room assignment:', error);
      res.status(500).json({ message: "Failed to remove backbone source room assignment" });
    }
  });

  // Get PPE for IBC application
  app.get('/api/ibc-applications/:id/ppe', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const roomId = req.query.roomId ? parseInt(req.query.roomId as string) : undefined;
      
      let ppe;
      if (roomId) {
        ppe = await storage.getIbcApplicationPpeForRoom(id, roomId);
      } else {
        ppe = await storage.getIbcApplicationPpe(id);
      }
      res.json(ppe);
    } catch (error) {
      console.error('Error getting IBC application PPE:', error);
      res.status(500).json({ message: "Failed to fetch IBC application PPE" });
    }
  });

  // Add PPE to IBC application
  app.post('/api/ibc-applications/:id/ppe', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const validatedData = insertIbcApplicationPpeSchema.parse({
        ...req.body,
        applicationId
      });
      const newPpe = await storage.addPpeToIbcApplication(validatedData);
      res.status(201).json(newPpe);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: fromZodError(error).toString() });
      } else {
        console.error('Error adding PPE to IBC application:', error);
        res.status(500).json({ message: "Failed to add PPE to IBC application" });
      }
    }
  });

  // Remove PPE from IBC application
  app.delete('/api/ibc-applications/:id/ppe/:roomId/:ppeItem', async (req: Request, res: Response) => {
    try {
      const applicationId = parseInt(req.params.id);
      const roomId = parseInt(req.params.roomId);
      const ppeItem = decodeURIComponent(req.params.ppeItem);
      const success = await storage.removePpeFromIbcApplication(applicationId, roomId, ppeItem);
      if (success) {
        res.json({ message: "PPE removed from IBC application successfully" });
      } else {
        res.status(404).json({ message: "PPE not found in IBC application" });
      }
    } catch (error) {
      console.error('Error removing PPE from IBC application:', error);
      res.status(500).json({ message: "Failed to remove PPE from IBC application" });
    }
  });

  // IBC Board Members
  app.get('/api/ibc-board-members', async (req: Request, res: Response) => {
    try {
      const boardMembers = await storage.getIbcBoardMembers();
      res.json(boardMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC board members" });
    }
  });

  app.get('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const boardMember = await storage.getIbcBoardMember(id);
      if (!boardMember) {
        return res.status(404).json({ message: "IBC board member not found" });
      }

      res.json(boardMember);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC board member" });
    }
  });

  app.post('/api/ibc-board-members', async (req: Request, res: Response) => {
    try {
      // Create a simplified validation that accepts string dates
      const validateData = {
        scientistId: req.body.scientistId,
        role: req.body.role,
        appointmentDate: req.body.appointmentDate,
        termEndDate: req.body.termEndDate,
        expertise: req.body.expertise || [],
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
        notes: req.body.notes
      };
      
      // Basic validation
      if (!validateData.scientistId || !validateData.role || !validateData.termEndDate) {
        return res.status(400).json({ message: "Missing required fields: scientistId, role, termEndDate" });
      }
      
      // Check if scientist exists
      const scientist = await storage.getScientist(validateData.scientistId);
      if (!scientist) {
        return res.status(404).json({ message: "Scientist not found" });
      }
      
      const boardMember = await storage.createIbcBoardMember(validateData);
      res.status(201).json(boardMember);
    } catch (error) {
      console.error("Board member creation error:", error);
      res.status(500).json({ message: "Failed to create IBC board member" });
    }
  });

  app.patch('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const validateData = insertIbcBoardMemberSchema.partial().parse(req.body);
      
      // Check if scientist exists if scientistId is provided
      if (validateData.scientistId) {
        const scientist = await storage.getScientist(validateData.scientistId);
        if (!scientist) {
          return res.status(404).json({ message: "Scientist not found" });
        }
      }
      
      const boardMember = await storage.updateIbcBoardMember(id, validateData);
      
      if (!boardMember) {
        return res.status(404).json({ message: "IBC board member not found" });
      }
      
      res.json(boardMember);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC board member" });
    }
  });

  app.delete('/api/ibc-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC board member ID" });
      }

      const success = await storage.deleteIbcBoardMember(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC board member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC board member" });
    }
  });

  // IBC Submissions
  app.get('/api/ibc-submissions', async (req: Request, res: Response) => {
    try {
      const applicationId = req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined;
      
      let submissions;
      if (applicationId && !isNaN(applicationId)) {
        submissions = await storage.getIbcSubmissionsForApplication(applicationId);
      } else {
        submissions = await storage.getIbcSubmissions();
      }
      
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC submissions" });
    }
  });

  app.get('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const submission = await storage.getIbcSubmission(id);
      if (!submission) {
        return res.status(404).json({ message: "IBC submission not found" });
      }

      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC submission" });
    }
  });

  app.post('/api/ibc-submissions', async (req: Request, res: Response) => {
    try {
      const validateData = insertIbcSubmissionSchema.parse(req.body);
      
      // Check if application exists
      const application = await storage.getIbcApplication(validateData.applicationId);
      if (!application) {
        return res.status(404).json({ message: "IBC application not found" });
      }
      
      // Check if submitted by scientist exists
      const scientist = await storage.getScientist(validateData.submittedBy);
      if (!scientist) {
        return res.status(404).json({ message: "Submitting scientist not found" });
      }
      
      const submission = await storage.createIbcSubmission(validateData);
      res.status(201).json(submission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IBC submission" });
    }
  });

  app.patch('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const validateData = insertIbcSubmissionSchema.partial().parse(req.body);
      const submission = await storage.updateIbcSubmission(id, validateData);
      
      if (!submission) {
        return res.status(404).json({ message: "IBC submission not found" });
      }
      
      res.json(submission);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC submission" });
    }
  });

  app.delete('/api/ibc-submissions/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC submission ID" });
      }

      const success = await storage.deleteIbcSubmission(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC submission not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC submission" });
    }
  });

  // IBC Documents
  app.get('/api/ibc-documents', async (req: Request, res: Response) => {
    try {
      const applicationId = req.query.applicationId ? parseInt(req.query.applicationId as string) : undefined;
      
      let documents;
      if (applicationId && !isNaN(applicationId)) {
        documents = await storage.getIbcDocumentsForApplication(applicationId);
      } else {
        documents = await storage.getIbcDocuments();
      }
      
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC documents" });
    }
  });

  app.get('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const document = await storage.getIbcDocument(id);
      if (!document) {
        return res.status(404).json({ message: "IBC document not found" });
      }

      res.json(document);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch IBC document" });
    }
  });

  app.post('/api/ibc-documents', async (req: Request, res: Response) => {
    try {
      const validateData = insertIbcDocumentSchema.parse(req.body);
      
      // Check if application exists (if provided)
      if (validateData.applicationId) {
        const application = await storage.getIbcApplication(validateData.applicationId);
        if (!application) {
          return res.status(404).json({ message: "IBC application not found" });
        }
      }
      
      // Check if uploaded by scientist exists
      const scientist = await storage.getScientist(validateData.uploadedBy);
      if (!scientist) {
        return res.status(404).json({ message: "Uploading scientist not found" });
      }
      
      const document = await storage.createIbcDocument(validateData);
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create IBC document" });
    }
  });

  app.patch('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const validateData = insertIbcDocumentSchema.partial().parse(req.body);
      const document = await storage.updateIbcDocument(id, validateData);
      
      if (!document) {
        return res.status(404).json({ message: "IBC document not found" });
      }
      
      res.json(document);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update IBC document" });
    }
  });

  app.delete('/api/ibc-documents/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid IBC document ID" });
      }

      const success = await storage.deleteIbcDocument(id);
      
      if (!success) {
        return res.status(404).json({ message: "IBC document not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete IBC document" });
    }
  });

  // Research Contracts
  app.get('/api/research-contracts', async (req: Request, res: Response) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      
      let contracts;
      if (projectId && !isNaN(projectId)) {
        contracts = await storage.getResearchContractsForProject(projectId);
      } else {
        contracts = await storage.getResearchContracts();
      }
      
      // Enhance contracts with project and PI details
      const enhancedContracts = await Promise.all(contracts.map(async (contract) => {
        const project = await storage.getProject(contract.projectId);
        const pi = contract.principalInvestigatorId ? 
          await storage.getScientist(contract.principalInvestigatorId) : null;
        
        return {
          ...contract,
          project: project ? {
            id: project.id,
            title: project.title
          } : null,
          principalInvestigator: pi ? {
            id: pi.id,
            name: pi.name,
            profileImageInitials: pi.profileImageInitials
          } : null
        };
      }));
      
      res.json(enhancedContracts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research contracts" });
    }
  });

  app.get('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const contract = await storage.getResearchContract(id);
      if (!contract) {
        return res.status(404).json({ message: "Research contract not found" });
      }

      // Get related details
      const project = await storage.getProject(contract.projectId);
      const pi = contract.principalInvestigatorId ? 
        await storage.getScientist(contract.principalInvestigatorId) : null;
      
      const enhancedContract = {
        ...contract,
        project: project ? {
          id: project.id,
          title: project.title
        } : null,
        principalInvestigator: pi ? {
          id: pi.id,
          name: pi.name,
          profileImageInitials: pi.profileImageInitials
        } : null
      };

      res.json(enhancedContract);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch research contract" });
    }
  });

  app.post('/api/research-contracts', async (req: Request, res: Response) => {
    try {
      const validateData = insertResearchContractSchema.parse(req.body);
      
      // Check if project exists
      const project = await storage.getProject(validateData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const contract = await storage.createResearchContract(validateData);
      res.status(201).json(contract);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to create research contract" });
    }
  });

  app.patch('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const validateData = insertResearchContractSchema.partial().parse(req.body);
      
      // Check if project exists if projectId is provided
      if (validateData.projectId) {
        const project = await storage.getProject(validateData.projectId);
        if (!project) {
          return res.status(404).json({ message: "Project not found" });
        }
      }
      
      // Check if principal investigator exists if provided
      if (validateData.principalInvestigatorId) {
        const pi = await storage.getScientist(validateData.principalInvestigatorId);
        if (!pi) {
          return res.status(404).json({ message: "Principal investigator not found" });
        }
      }
      
      const contract = await storage.updateResearchContract(id, validateData);
      
      if (!contract) {
        return res.status(404).json({ message: "Research contract not found" });
      }
      
      res.json(contract);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ message: fromZodError(error).message });
      }
      res.status(500).json({ message: "Failed to update research contract" });
    }
  });

  app.delete('/api/research-contracts/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid research contract ID" });
      }

      const success = await storage.deleteResearchContract(id);
      
      if (!success) {
        return res.status(404).json({ message: "Research contract not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete research contract" });
    }
  });

  // IRB Board Members API
  app.get('/api/irb-board-members', async (req: Request, res: Response) => {
    try {
      const members = await storage.getIrbBoardMembers();
      res.json(members);
    } catch (error) {
      console.error('Error fetching IRB board members:', error);
      res.status(500).json({ message: "Failed to fetch IRB board members" });
    }
  });

  app.get('/api/irb-board-members/active', async (req: Request, res: Response) => {
    try {
      const members = await storage.getActiveIrbBoardMembers();
      res.json(members);
    } catch (error) {
      console.error('Error fetching active IRB board members:', error);
      res.status(500).json({ message: "Failed to fetch active IRB board members" });
    }
  });

  app.get('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      const member = await storage.getIrbBoardMember(id);
      if (!member) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error('Error fetching IRB board member:', error);
      res.status(500).json({ message: "Failed to fetch IRB board member" });
    }
  });

  app.post('/api/irb-board-members', async (req: Request, res: Response) => {
    try {
      console.log('Creating IRB board member with data:', req.body);
      
      // Validate required fields
      if (!req.body.scientistId || !req.body.role) {
        return res.status(400).json({ message: "Scientist ID and role are required" });
      }

      // Check for existing chair or deputy chair if trying to assign these roles
      if (req.body.role === 'chair' || req.body.role === 'deputy_chair') {
        const existingMembers = await storage.getIrbBoardMembers();
        const existingRole = existingMembers.find(m => m.role === req.body.role && m.isActive);
        
        if (existingRole) {
          const roleLabel = req.body.role === 'chair' ? 'Chair' : 'Deputy Chair';
          return res.status(400).json({ 
            message: `An active ${roleLabel} already exists. Please deactivate the current ${roleLabel} first.` 
          });
        }
      }

      // Set default term end date to 3 years from now if not provided
      if (!req.body.termEndDate) {
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);
        req.body.termEndDate = threeYearsFromNow.toISOString();
      }

      // Ensure expertise is an array
      if (typeof req.body.expertise === 'string') {
        req.body.expertise = [req.body.expertise];
      } else if (!req.body.expertise) {
        req.body.expertise = [];
      }

      const member = await storage.createIrbBoardMember(req.body);
      console.log('Successfully created IRB board member:', member);
      res.status(201).json(member);
    } catch (error) {
      console.error('Error creating IRB board member:', error);
      res.status(500).json({ message: "Failed to create IRB board member", error: error.message });
    }
  });

  app.patch('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      console.log('Updating IRB board member with data:', req.body);

      // Check for existing chair or deputy chair if trying to assign these roles
      if (req.body.role === 'chair' || req.body.role === 'deputy_chair') {
        const existingMembers = await storage.getIrbBoardMembers();
        const existingRole = existingMembers.find(m => m.role === req.body.role && m.isActive && m.id !== id);
        
        if (existingRole) {
          const roleLabel = req.body.role === 'chair' ? 'Chair' : 'Deputy Chair';
          return res.status(400).json({ 
            message: `An active ${roleLabel} already exists. Please change the current ${roleLabel} to member first.` 
          });
        }
      }

      const member = await storage.updateIrbBoardMember(id, req.body);
      if (!member) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json(member);
    } catch (error) {
      console.error('Error updating IRB board member:', error);
      res.status(500).json({ message: "Failed to update IRB board member", error: error.message });
    }
  });

  app.delete('/api/irb-board-members/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid board member ID" });
      }

      const success = await storage.deleteIrbBoardMember(id);
      if (!success) {
        return res.status(404).json({ message: "IRB board member not found" });
      }

      res.json({ message: "IRB board member deleted successfully" });
    } catch (error) {
      console.error('Error deleting IRB board member:', error);
      res.status(500).json({ message: "Failed to delete IRB board member", error: error.message });
    }
  });

  // Buildings API routes
  app.get('/api/buildings', async (req: Request, res: Response) => {
    try {
      const buildings = await storage.getBuildings();
      res.json(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({ message: "Failed to fetch buildings" });
    }
  });

  app.get('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const building = await storage.getBuilding(id);
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json(building);
    } catch (error) {
      console.error('Error fetching building:', error);
      res.status(500).json({ message: "Failed to fetch building" });
    }
  });

  app.post('/api/buildings', async (req: Request, res: Response) => {
    try {
      const parsedData = insertBuildingSchema.parse(req.body);
      const building = await storage.createBuilding(parsedData);
      res.status(201).json(building);
    } catch (error) {
      console.error('Error creating building:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create building" });
    }
  });

  app.patch('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const parsedData = insertBuildingSchema.partial().parse(req.body);
      const building = await storage.updateBuilding(id, parsedData);
      if (!building) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json(building);
    } catch (error) {
      console.error('Error updating building:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to update building" });
    }
  });

  app.delete('/api/buildings/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const success = await storage.deleteBuilding(id);
      if (!success) {
        return res.status(404).json({ message: "Building not found" });
      }

      res.json({ message: "Building deleted successfully" });
    } catch (error) {
      console.error('Error deleting building:', error);
      res.status(500).json({ message: "Failed to delete building" });
    }
  });

  // Rooms API routes
  app.get('/api/rooms', async (req: Request, res: Response) => {
    try {
      const buildingId = req.query.buildingId ? parseInt(req.query.buildingId as string) : undefined;
      
      if (buildingId) {
        const rooms = await storage.getRoomsByBuilding(buildingId);
        res.json(rooms);
      } else {
        const rooms = await storage.getRooms();
        res.json(rooms);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ message: "Failed to fetch rooms" });
    }
  });

  app.get('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const room = await storage.getRoom(id);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(room);
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ message: "Failed to fetch room" });
    }
  });

  app.post('/api/rooms', async (req: Request, res: Response) => {
    try {
      const parsedData = insertRoomSchema.parse(req.body);
      
      // Validate supervisor and manager roles if provided
      if (parsedData.roomSupervisorId) {
        const supervisor = await storage.getScientist(parsedData.roomSupervisorId);
        if (!supervisor || !supervisor.title || !supervisor.title.toLowerCase().includes('investigator')) {
          return res.status(400).json({ 
            message: "Room supervisor must be a scientist with 'Investigator' in their title" 
          });
        }
      }
      
      if (parsedData.roomManagerId) {
        const manager = await storage.getScientist(parsedData.roomManagerId);
        if (!manager || !manager.title || 
            !(manager.title.toLowerCase().includes('staff') || 
              manager.title.toLowerCase().includes('management') ||
              manager.title.toLowerCase().includes('post-doctoral') ||
              manager.title.toLowerCase().includes('research'))) {
          return res.status(400).json({ 
            message: "Room manager must be a scientist with Management, Staff, Post-doctoral, or Research role" 
          });
        }
      }

      const room = await storage.createRoom(parsedData);
      res.status(201).json(room);
    } catch (error) {
      console.error('Error creating room:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create room" });
    }
  });

  app.patch('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const parsedData = insertRoomSchema.partial().parse(req.body);
      
      // Validate supervisor and manager roles if being updated
      if (parsedData.roomSupervisorId) {
        const supervisor = await storage.getScientist(parsedData.roomSupervisorId);
        if (!supervisor || !supervisor.title || !supervisor.title.toLowerCase().includes('investigator')) {
          return res.status(400).json({ 
            message: "Room supervisor must be a scientist with 'Investigator' in their title" 
          });
        }
      }
      
      if (parsedData.roomManagerId) {
        const manager = await storage.getScientist(parsedData.roomManagerId);
        if (!manager || !manager.title || 
            !(manager.title.toLowerCase().includes('staff') || 
              manager.title.toLowerCase().includes('management') ||
              manager.title.toLowerCase().includes('post-doctoral') ||
              manager.title.toLowerCase().includes('research'))) {
          return res.status(400).json({ 
            message: "Room manager must be a scientist with Management, Staff, Post-doctoral, or Research role" 
          });
        }
      }

      const room = await storage.updateRoom(id, parsedData);
      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json(room);
    } catch (error) {
      console.error('Error updating room:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to update room" });
    }
  });

  app.delete('/api/rooms/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid room ID" });
      }

      const success = await storage.deleteRoom(id);
      if (!success) {
        return res.status(404).json({ message: "Room not found" });
      }

      res.json({ message: "Room deleted successfully" });
    } catch (error) {
      console.error('Error deleting room:', error);
      res.status(500).json({ message: "Failed to delete room" });
    }
  });

  // Additional utility routes for facilities
  app.get('/api/buildings/:id/rooms', async (req: Request, res: Response) => {
    try {
      const buildingId = parseInt(req.params.id);
      if (isNaN(buildingId)) {
        return res.status(400).json({ message: "Invalid building ID" });
      }

      const rooms = await storage.getRoomsByBuilding(buildingId);
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching building rooms:', error);
      res.status(500).json({ message: "Failed to fetch building rooms" });
    }
  });

  // Role Permissions Routes
  app.get('/api/role-permissions', async (req: Request, res: Response) => {
    try {
      const permissions = await storage.getRolePermissions();
      res.json(permissions);
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      res.status(500).json({ message: "Failed to fetch role permissions" });
    }
  });

  app.post('/api/role-permissions', async (req: Request, res: Response) => {
    try {
      const validateData = insertRolePermissionSchema.parse(req.body);
      const permission = await storage.createRolePermission(validateData);
      res.status(201).json(permission);
    } catch (error) {
      console.error('Error creating role permission:', error);
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        return res.status(400).json({ message: validationError.message });
      }
      res.status(500).json({ message: "Failed to create role permission" });
    }
  });

  app.patch('/api/role-permissions/:jobTitle/:navigationItem', async (req: Request, res: Response) => {
    try {
      const { jobTitle, navigationItem } = req.params;
      const { accessLevel } = req.body;
      
      if (!accessLevel || !["hide", "view", "edit"].includes(accessLevel)) {
        return res.status(400).json({ message: "Invalid access level" });
      }

      const permission = await storage.updateRolePermission(jobTitle, navigationItem, accessLevel);
      if (!permission) {
        return res.status(404).json({ message: "Role permission not found" });
      }
      
      res.json(permission);
    } catch (error) {
      console.error('Error updating role permission:', error);
      res.status(500).json({ message: "Failed to update role permission" });
    }
  });

  app.post('/api/role-permissions/bulk', async (req: Request, res: Response) => {
    try {
      const { permissions } = req.body;
      if (!Array.isArray(permissions)) {
        return res.status(400).json({ message: "Permissions must be an array" });
      }

      const results = await storage.updateRolePermissionsBulk(permissions);
      res.json(results);
    } catch (error) {
      console.error('Error bulk updating role permissions:', error);
      res.status(500).json({ message: "Failed to bulk update role permissions" });
    }
  });

  // Journal Impact Factors Routes
  app.get('/api/journal-impact-factors', async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const sortField = req.query.sortField as string || 'rank';
      const sortDirection = (req.query.sortDirection as 'asc' | 'desc') || 'asc';
      const searchTerm = req.query.searchTerm as string || '';
      const yearFilter = req.query.yearFilter as string || '';

      const result = await storage.getJournalImpactFactors({
        limit,
        offset,
        sortField,
        sortDirection,
        searchTerm,
        yearFilter
      });
      
      res.json(result);
    } catch (error) {
      console.error('Error fetching journal impact factors:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factors" });
    }
  });

  app.get('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const factor = await storage.getJournalImpactFactor(id);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.json(factor);
    } catch (error) {
      console.error('Error fetching journal impact factor:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factor" });
    }
  });

  app.get('/api/journal-impact-factors/journal/:journalName/year/:year', async (req: Request, res: Response) => {
    try {
      const { journalName, year } = req.params;
      const yearNum = parseInt(year);
      
      if (isNaN(yearNum)) {
        return res.status(400).json({ message: "Invalid year" });
      }

      const factor = await storage.getImpactFactorByJournalAndYear(journalName, yearNum);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found for this journal and year" });
      }

      res.json(factor);
    } catch (error) {
      console.error('Error fetching journal impact factor:', error);
      res.status(500).json({ message: "Failed to fetch journal impact factor" });
    }
  });

  app.get('/api/journal-impact-factors/historical/:journalName', async (req: Request, res: Response) => {
    try {
      const { journalName } = req.params;
      const decodedJournalName = decodeURIComponent(journalName);
      
      const historicalData = await storage.getHistoricalImpactFactors(decodedJournalName);
      res.json(historicalData);
    } catch (error) {
      console.error('Error fetching historical impact factors:', error);
      res.status(500).json({ message: "Failed to fetch historical impact factors" });
    }
  });

  app.post('/api/journal-impact-factors', async (req: Request, res: Response) => {
    try {
      const { insertJournalImpactFactorSchema } = await import("@shared/schema");
      const parsedData = insertJournalImpactFactorSchema.parse(req.body);
      
      const factor = await storage.createJournalImpactFactor(parsedData);
      res.status(201).json(factor);
    } catch (error: any) {
      console.error('Error creating journal impact factor:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to create journal impact factor" });
    }
  });

  app.post('/api/journal-impact-factors/import-csv', async (req: Request, res: Response) => {
    try {
      const { csvData } = req.body;
      if (!csvData || !Array.isArray(csvData)) {
        return res.status(400).json({ message: "CSV data must be an array" });
      }

      const results = [];
      for (const row of csvData) {
        try {
          const impactFactor = {
            journalName: row.journalName,
            abbreviatedJournal: row.abbreviatedJournal || null,
            year: row.year,
            publisher: row.publisher || null,
            issn: row.issn || null,
            eissn: row.eissn || null,
            totalCites: row.totalCites || null,
            totalArticles: row.totalArticles || null,
            citableItems: row.citableItems || null,
            citedHalfLife: row.citedHalfLife || null,
            citingHalfLife: row.citingHalfLife || null,
            impactFactor: row.impactFactor,
            fiveYearJif: row.fiveYearJif || null,
            jifWithoutSelfCites: row.jifWithoutSelfCites || null,
            jci: row.jci || null,
            quartile: row.quartile,
            rank: row.rank,
            totalCitations: row.totalCitations || null // Keep for backward compatibility
          };
          
          const created = await storage.createJournalImpactFactor(impactFactor);
          results.push(created);
        } catch (error) {
          console.error('Error importing row:', row, error);
        }
      }

      res.json({ imported: results.length, total: csvData.length });
    } catch (error) {
      console.error('Error importing CSV data:', error);
      res.status(500).json({ message: "Failed to import CSV data" });
    }
  });

  app.patch('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const { insertJournalImpactFactorSchema } = await import("@shared/schema");
      const parsedData = insertJournalImpactFactorSchema.partial().parse(req.body);
      
      const factor = await storage.updateJournalImpactFactor(id, parsedData);
      if (!factor) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.json(factor);
    } catch (error: any) {
      console.error('Error updating journal impact factor:', error);
      
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      res.status(500).json({ message: "Failed to update journal impact factor" });
    }
  });

  // Publication Import Routes
  app.get('/api/publications/import/pmid/:pmid', async (req: Request, res: Response) => {
    try {
      const pmid = req.params.pmid;
      
      // Fetch from PubMed E-utilities API
      const summaryUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pmid}&retmode=json`;
      const summaryResponse = await fetch(summaryUrl);
      
      if (!summaryResponse.ok) {
        return res.status(404).json({ message: "PMID not found" });
      }
      
      const summaryData = await summaryResponse.json();
      const pubmedData = summaryData.result?.[pmid];
      
      if (!pubmedData) {
        return res.status(404).json({ message: "Publication not found for this PMID" });
      }
      
      // Parse PubMed data
      const authors = pubmedData.authors?.map((author: any) => 
        author.name
      ).join(', ') || '';
      
      const publication = {
        title: pubmedData.title || '',
        authors: authors,
        journal: pubmedData.fulljournalname || pubmedData.source || '',
        year: pubmedData.pubdate ? new Date(pubmedData.pubdate).getFullYear() : null,
        volume: pubmedData.volume || '',
        issue: pubmedData.issue || '',
        pages: pubmedData.pages || '',
        doi: pubmedData.elocationid?.replace('doi: ', '') || pubmedData.articleids?.find((id: any) => id.idtype === 'doi')?.value || '',
        pmid: pmid,
        abstract: pubmedData.abstract || '',
        publicationDate: pubmedData.pubdate ? new Date(pubmedData.pubdate).toISOString().split('T')[0] : ''
      };
      
      res.json(publication);
    } catch (error) {
      console.error('Error fetching PubMed data:', error);
      res.status(500).json({ message: "Failed to fetch publication data from PubMed" });
    }
  });

  app.get('/api/publications/import/doi/:doi', async (req: Request, res: Response) => {
    try {
      const doi = decodeURIComponent(req.params.doi);
      
      // Fetch from CrossRef API
      const crossrefUrl = `https://api.crossref.org/works/${doi}`;
      const crossrefResponse = await fetch(crossrefUrl);
      
      if (!crossrefResponse.ok) {
        return res.status(404).json({ message: "DOI not found" });
      }
      
      const crossrefData = await crossrefResponse.json();
      const work = crossrefData.message;
      
      if (!work) {
        return res.status(404).json({ message: "Publication not found for this DOI" });
      }
      
      // Parse CrossRef data
      const authors = work.author?.map((author: any) => 
        `${author.given || ''} ${author.family || ''}`.trim()
      ).join(', ') || '';
      
      const publication = {
        title: work.title?.[0] || '',
        authors: authors,
        journal: work['container-title']?.[0] || '',
        year: work.published?.['date-parts']?.[0]?.[0] || work.created?.['date-parts']?.[0]?.[0] || null,
        volume: work.volume || '',
        issue: work.issue || '',
        pages: work.page || '',
        doi: work.DOI || doi,
        pmid: '', // CrossRef doesn't provide PMID
        abstract: work.abstract || '',
        publicationDate: work.published?.['date-parts']?.[0] ? 
          new Date(work.published['date-parts'][0][0], (work.published['date-parts'][0][1] || 1) - 1, work.published['date-parts'][0][2] || 1).toISOString().split('T')[0] : ''
      };
      
      res.json(publication);
    } catch (error) {
      console.error('Error fetching CrossRef data:', error);
      res.status(500).json({ message: "Failed to fetch publication data from CrossRef" });
    }
  });

  app.delete('/api/journal-impact-factors/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid impact factor ID" });
      }

      const success = await storage.deleteJournalImpactFactor(id);
      if (!success) {
        return res.status(404).json({ message: "Impact factor not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting journal impact factor:', error);
      res.status(500).json({ message: "Failed to delete journal impact factor" });
    }
  });

  // Grant routes
  app.get('/api/grants', async (req: Request, res: Response) => {
    try {
      const grants = await storage.getGrants();
      
      // Enhance grants with scientist information
      const enhancedGrants = await Promise.all(grants.map(async (grant) => {
        const lpi = grant.lpiId ? await storage.getScientist(grant.lpiId) : null;
        const researcher = grant.researcherId ? await storage.getScientist(grant.researcherId) : null;
        
        return {
          ...grant,
          lpi: lpi ? {
            id: lpi.id,
            firstName: lpi.firstName,
            lastName: lpi.lastName,
            honorificTitle: lpi.honorificTitle
          } : null,
          researcher: researcher ? {
            id: researcher.id,
            firstName: researcher.firstName,
            lastName: researcher.lastName,
            honorificTitle: researcher.honorificTitle
          } : null
        };
      }));
      
      res.json(enhancedGrants);
    } catch (error) {
      console.error('Error fetching grants:', error);
      res.status(500).json({ message: "Failed to fetch grants" });
    }
  });

  app.get('/api/grants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const grant = await storage.getGrant(id);
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }

      res.json(grant);
    } catch (error) {
      console.error('Error fetching grant:', error);
      res.status(500).json({ message: "Failed to fetch grant" });
    }
  });

  app.post('/api/grants', async (req: Request, res: Response) => {
    try {
      const validatedData = insertGrantSchema.parse(req.body);
      const grant = await storage.createGrant(validatedData);
      res.status(201).json(grant);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ 
          message: "Invalid grant data", 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Error creating grant:', error);
      res.status(500).json({ message: "Failed to create grant" });
    }
  });

  app.put('/api/grants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const validatedData = insertGrantSchema.partial().parse(req.body);
      const grant = await storage.updateGrant(id, validatedData);
      
      if (!grant) {
        return res.status(404).json({ message: "Grant not found" });
      }

      res.json(grant);
    } catch (error) {
      if (error instanceof ZodError) {
        console.error('Validation error:', fromZodError(error).toString());
        return res.status(400).json({ 
          message: "Invalid grant data", 
          details: fromZodError(error).toString() 
        });
      }
      console.error('Error updating grant:', error);
      res.status(500).json({ message: "Failed to update grant" });
    }
  });

  app.delete('/api/grants/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const success = await storage.deleteGrant(id);
      if (!success) {
        return res.status(404).json({ message: "Grant not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting grant:', error);
      res.status(500).json({ message: "Failed to delete grant" });
    }
  });

  // CSV export for grants
  app.get('/api/grants/export/csv', async (req: Request, res: Response) => {
    try {
      const grants = await storage.getGrants();
      
      // Enhance grants with scientist information for CSV
      const enhancedGrants = await Promise.all(grants.map(async (grant) => {
        const lpi = grant.lpiId ? await storage.getScientist(grant.lpiId) : null;
        const researcher = grant.researcherId ? await storage.getScientist(grant.researcherId) : null;
        
        return {
          ...grant,
          lpiName: lpi ? `${lpi.honorificTitle} ${lpi.firstName} ${lpi.lastName}` : '',
          researcherName: researcher ? `${researcher.honorificTitle} ${researcher.firstName} ${researcher.lastName}` : '',
          collaboratorsString: grant.collaborators ? grant.collaborators.join('; ') : ''
        };
      }));

      // Create CSV content
      const csvHeaders = [
        'Cycle', 'Project Number', 'LPI', 'Researcher', 'Title', 
        'Requested Amount', 'Awarded Amount', 'Submitted Year', 'Awarded Year',
        'Current Year', 'Status', 'Start Date', 'End Date', 'Collaborators',
        'Description', 'Funding Agency'
      ];
      
      const csvRows = enhancedGrants.map(grant => [
        grant.cycle || '',
        grant.projectNumber,
        grant.lpiName,
        grant.researcherName,
        grant.title,
        grant.requestedAmount || '',
        grant.awardedAmount || '',
        grant.submittedYear || '',
        grant.awardedYear || '',
        grant.currentYear || '',
        grant.status,
        grant.startDate || '',
        grant.endDate || '',
        grant.collaboratorsString,
        grant.description || '',
        grant.fundingAgency || ''
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
        .join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=grants.csv');
      res.send(csvContent);
    } catch (error) {
      console.error('Error exporting grants to CSV:', error);
      res.status(500).json({ message: "Failed to export grants" });
    }
  });

  // Grant-Research Activity relationship routes
  app.get('/api/grants/:id/research-activities', async (req: Request, res: Response) => {
    try {
      const grantId = parseInt(req.params.id);
      if (isNaN(grantId)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const researchActivities = await storage.getGrantResearchActivities(grantId);
      res.json(researchActivities);
    } catch (error) {
      console.error('Error fetching grant research activities:', error);
      res.status(500).json({ message: "Failed to fetch grant research activities" });
    }
  });

  app.post('/api/grants/:grantId/research-activities/:researchActivityId', async (req: Request, res: Response) => {
    try {
      const grantId = parseInt(req.params.grantId);
      const researchActivityId = parseInt(req.params.researchActivityId);
      
      if (isNaN(grantId) || isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid grant or research activity ID" });
      }

      const relationship = await storage.addGrantResearchActivity(grantId, researchActivityId);
      res.status(201).json(relationship);
    } catch (error) {
      console.error('Error linking grant to research activity:', error);
      res.status(500).json({ message: "Failed to link grant to research activity" });
    }
  });

  app.delete('/api/grants/:grantId/research-activities/:researchActivityId', async (req: Request, res: Response) => {
    try {
      const grantId = parseInt(req.params.grantId);
      const researchActivityId = parseInt(req.params.researchActivityId);
      
      if (isNaN(grantId) || isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid grant or research activity ID" });
      }

      const success = await storage.removeGrantResearchActivity(grantId, researchActivityId);
      if (!success) {
        return res.status(404).json({ message: "Relationship not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error unlinking grant from research activity:', error);
      res.status(500).json({ message: "Failed to unlink grant from research activity" });
    }
  });

  app.get('/api/research-activities/:id/grants', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const grants = await storage.getResearchActivityGrants(researchActivityId);
      res.json(grants);
    } catch (error) {
      console.error('Error fetching research activity grants:', error);
      res.status(500).json({ message: "Failed to fetch research activity grants" });
    }
  });

  app.get('/api/research-activities/:id/ibc-applications', async (req: Request, res: Response) => {
    try {
      const researchActivityId = parseInt(req.params.id);
      if (isNaN(researchActivityId)) {
        return res.status(400).json({ message: "Invalid research activity ID" });
      }

      const ibcApplications = await storage.getResearchActivityIbcApplications(researchActivityId);
      res.json(ibcApplications);
    } catch (error) {
      console.error('Error fetching research activity IBC applications:', error);
      res.status(500).json({ message: "Failed to fetch research activity IBC applications" });
    }
  });

  // Grant Progress Reports endpoints
  app.get('/api/grants/:id/progress-reports', async (req: Request, res: Response) => {
    try {
      const grantId = parseInt(req.params.id);
      if (isNaN(grantId)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const progressReports = await storage.getGrantProgressReports(grantId);
      res.json(progressReports);
    } catch (error) {
      console.error('Error fetching grant progress reports:', error);
      res.status(500).json({ message: "Failed to fetch grant progress reports" });
    }
  });

  app.post('/api/grants/:id/progress-reports', async (req: Request, res: Response) => {
    try {
      const grantId = parseInt(req.params.id);
      if (isNaN(grantId)) {
        return res.status(400).json({ message: "Invalid grant ID" });
      }

      const reportData = {
        ...req.body,
        grantId,
        uploadedBy: 1 // TODO: Get from authenticated user
      };

      const newReport = await storage.createGrantProgressReport(reportData);
      res.status(201).json(newReport);
    } catch (error) {
      console.error('Error creating grant progress report:', error);
      res.status(500).json({ message: "Failed to create grant progress report" });
    }
  });

  app.put('/api/grant-progress-reports/:id', async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }

      const updatedReport = await storage.updateGrantProgressReport(reportId, req.body);
      res.json(updatedReport);
    } catch (error) {
      console.error('Error updating grant progress report:', error);
      res.status(500).json({ message: "Failed to update grant progress report" });
    }
  });

  app.delete('/api/grant-progress-reports/:id', async (req: Request, res: Response) => {
    try {
      const reportId = parseInt(req.params.id);
      if (isNaN(reportId)) {
        return res.status(400).json({ message: "Invalid report ID" });
      }

      const success = await storage.deleteGrantProgressReport(reportId);
      if (!success) {
        return res.status(404).json({ message: "Progress report not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting grant progress report:', error);
      res.status(500).json({ message: "Failed to delete grant progress report" });
    }
  });

  // Certification routes
  app.get('/api/certification-modules', async (req: Request, res: Response) => {
    try {
      const modules = await storage.getCertificationModules();
      res.json(modules);
    } catch (error) {
      console.error('Error fetching certification modules:', error);
      res.status(500).json({ message: "Failed to fetch certification modules" });
    }
  });

  app.post('/api/certification-modules', async (req: Request, res: Response) => {
    try {
      const validatedData = insertCertificationModuleSchema.parse(req.body);
      const module = await storage.createCertificationModule(validatedData);
      res.status(201).json(module);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error creating certification module:', error);
        res.status(500).json({ message: "Failed to create certification module" });
      }
    }
  });

  app.put('/api/certification-modules/:id', async (req: Request, res: Response) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const validatedData = insertCertificationModuleSchema.partial().parse(req.body);
      const module = await storage.updateCertificationModule(moduleId, validatedData);
      res.json(module);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error updating certification module:', error);
        res.status(500).json({ message: "Failed to update certification module" });
      }
    }
  });

  app.delete('/api/certification-modules/:id', async (req: Request, res: Response) => {
    try {
      const moduleId = parseInt(req.params.id);
      if (isNaN(moduleId)) {
        return res.status(400).json({ message: "Invalid module ID" });
      }

      const success = await storage.deleteCertificationModule(moduleId);
      if (!success) {
        return res.status(404).json({ message: "Certification module not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting certification module:', error);
      res.status(500).json({ message: "Failed to delete certification module" });
    }
  });

  // Certification routes
  app.get('/api/certifications', async (req: Request, res: Response) => {
    try {
      const certifications = await storage.getCertifications();
      res.json(certifications);
    } catch (error) {
      console.error('Error fetching certifications:', error);
      res.status(500).json({ message: "Failed to fetch certifications" });
    }
  });

  app.get('/api/certifications/matrix', async (req: Request, res: Response) => {
    try {
      const matrix = await storage.getCertificationMatrix();
      res.json(matrix);
    } catch (error) {
      console.error('Error fetching certification matrix:', error);
      res.status(500).json({ message: "Failed to fetch certification matrix" });
    }
  });

  app.get('/api/certifications/scientist/:scientistId', async (req: Request, res: Response) => {
    try {
      const scientistId = parseInt(req.params.scientistId);
      if (isNaN(scientistId)) {
        return res.status(400).json({ message: "Invalid scientist ID" });
      }

      const certifications = await storage.getCertificationsByScientist(scientistId);
      res.json(certifications);
    } catch (error) {
      console.error('Error fetching scientist certifications:', error);
      res.status(500).json({ message: "Failed to fetch scientist certifications" });
    }
  });

  app.post('/api/certifications', async (req: Request, res: Response) => {
    try {
      const validatedData = insertCertificationSchema.parse(req.body);
      const certification = await storage.createCertification(validatedData);
      res.status(201).json(certification);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error creating certification:', error);
        res.status(500).json({ message: "Failed to create certification" });
      }
    }
  });

  app.put('/api/certifications/:id', async (req: Request, res: Response) => {
    try {
      const certificationId = parseInt(req.params.id);
      if (isNaN(certificationId)) {
        return res.status(400).json({ message: "Invalid certification ID" });
      }

      const validatedData = insertCertificationSchema.partial().parse(req.body);
      const certification = await storage.updateCertification(certificationId, validatedData);
      res.json(certification);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error updating certification:', error);
        res.status(500).json({ message: "Failed to update certification" });
      }
    }
  });

  app.delete('/api/certifications/:id', async (req: Request, res: Response) => {
    try {
      const certificationId = parseInt(req.params.id);
      if (isNaN(certificationId)) {
        return res.status(400).json({ message: "Invalid certification ID" });
      }

      const success = await storage.deleteCertification(certificationId);
      if (!success) {
        return res.status(404).json({ message: "Certification not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error('Error deleting certification:', error);
      res.status(500).json({ message: "Failed to delete certification" });
    }
  });

  // Certification configuration routes
  app.get('/api/certification-config', async (req: Request, res: Response) => {
    try {
      const config = await storage.getCertificationConfiguration();
      res.json(config || {});
    } catch (error) {
      console.error('Error fetching certification configuration:', error);
      res.status(500).json({ message: "Failed to fetch certification configuration" });
    }
  });

  app.post('/api/certification-config', async (req: Request, res: Response) => {
    try {
      const validatedData = insertCertificationConfigurationSchema.parse(req.body);
      const config = await storage.createCertificationConfiguration(validatedData);
      res.status(201).json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error creating certification configuration:', error);
        res.status(500).json({ message: "Failed to create certification configuration" });
      }
    }
  });

  app.put('/api/certification-config/:id', async (req: Request, res: Response) => {
    try {
      const configId = parseInt(req.params.id);
      if (isNaN(configId)) {
        return res.status(400).json({ message: "Invalid config ID" });
      }

      const validatedData = insertCertificationConfigurationSchema.partial().parse(req.body);
      const config = await storage.updateCertificationConfiguration(configId, validatedData);
      res.json(config);
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        console.error('Error updating certification configuration:', error);
        res.status(500).json({ message: "Failed to update certification configuration" });
      }
    }
  });

  // System Configuration endpoints
  app.get('/api/system-configurations', async (req, res) => {
    try {
      const configs = await storage.getSystemConfigurations();
      res.json(configs);
    } catch (error) {
      console.error('Error fetching system configurations:', error);
      res.status(500).json({ error: 'Failed to fetch configurations' });
    }
  });

  app.get('/api/system-configurations/:key', async (req, res) => {
    try {
      const config = await storage.getSystemConfiguration(req.params.key);
      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Error fetching system configuration:', error);
      res.status(500).json({ error: 'Failed to fetch configuration' });
    }
  });

  app.post('/api/system-configurations', async (req, res) => {
    try {
      const config = await storage.createSystemConfiguration(req.body);
      res.status(201).json(config);
    } catch (error) {
      console.error('Error creating system configuration:', error);
      res.status(500).json({ error: 'Failed to create configuration' });
    }
  });

  app.put('/api/system-configurations/:key', async (req, res) => {
    try {
      const config = await storage.updateSystemConfiguration(req.params.key, req.body);
      if (!config) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      res.json(config);
    } catch (error) {
      console.error('Error updating system configuration:', error);
      res.status(500).json({ error: 'Failed to update configuration' });
    }
  });

  app.delete('/api/system-configurations/:key', async (req, res) => {
    try {
      const result = await storage.deleteSystemConfiguration(req.params.key);
      if (!result) {
        return res.status(404).json({ error: 'Configuration not found' });
      }
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting system configuration:', error);
      res.status(500).json({ error: 'Failed to delete configuration' });
    }
  });

  // OCR endpoint for PDF processing (stub for now)
  app.post('/api/certifications/process-pdf', async (req: Request, res: Response) => {
    try {
      const { fileUrl, fileName } = req.body;
      
      // TODO: Implement OCR processing here
      // For now, return a mock response
      const extractedData = {
        staffName: "Extracted Name",
        moduleName: "Extracted Module",
        startDate: "2024-01-01",
        endDate: "2027-01-01",
        confidence: 0.85
      };

      res.json({ 
        success: true, 
        extractedData,
        message: "PDF processed successfully (mock implementation)" 
      });
    } catch (error) {
      console.error('Error processing PDF:', error);
      res.status(500).json({ message: "Failed to process PDF" });
    }
  });

  // PDF Import History routes
  app.get('/api/pdf-import-history', async (req: Request, res: Response) => {
    try {
      const { scientistName, courseName, dateFrom, dateTo, status, uploadedBy } = req.query;
      
      const filters: any = {};
      if (scientistName) filters.scientistName = scientistName as string;
      if (courseName) filters.courseName = courseName as string;
      if (dateFrom) filters.dateFrom = new Date(dateFrom as string);
      if (dateTo) filters.dateTo = new Date(dateTo as string);
      if (status) filters.status = status as string;
      if (uploadedBy) filters.uploadedBy = parseInt(uploadedBy as string);
      
      const history = await storage.searchPdfImportHistory(filters);
      
      // Enhance with uploader information
      const enhancedHistory = await Promise.all(history.map(async (entry) => {
        const uploader = await storage.getScientist(entry.uploadedBy);
        const assignedScientist = entry.assignedScientistId ? await storage.getScientist(entry.assignedScientistId) : null;
        
        return {
          ...entry,
          uploader: uploader ? {
            id: uploader.id,
            name: `${uploader.firstName} ${uploader.lastName}`,
            email: uploader.email
          } : null,
          assignedScientist: assignedScientist ? {
            id: assignedScientist.id,
            name: `${assignedScientist.firstName} ${assignedScientist.lastName}`,
            email: assignedScientist.email
          } : null
        };
      }));
      
      res.json(enhancedHistory);
    } catch (error) {
      console.error("Error fetching PDF import history:", error);
      res.status(500).json({ message: "Failed to fetch PDF import history" });
    }
  });

  app.get('/api/pdf-import-history/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid history entry ID" });
      }

      const entry = await storage.getPdfImportHistoryEntry(id);
      if (!entry) {
        return res.status(404).json({ message: "PDF import history entry not found" });
      }

      // Enhance with additional information
      const uploader = await storage.getScientist(entry.uploadedBy);
      const assignedScientist = entry.assignedScientistId ? await storage.getScientist(entry.assignedScientistId) : null;

      const enhancedEntry = {
        ...entry,
        uploader: uploader ? {
          id: uploader.id,
          name: `${uploader.firstName} ${uploader.lastName}`,
          email: uploader.email
        } : null,
        assignedScientist: assignedScientist ? {
          id: assignedScientist.id,
          name: `${assignedScientist.firstName} ${assignedScientist.lastName}`,
          email: assignedScientist.email
        } : null
      };

      res.json(enhancedEntry);
    } catch (error) {
      console.error("Error fetching PDF import history entry:", error);
      res.status(500).json({ message: "Failed to fetch PDF import history entry" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
