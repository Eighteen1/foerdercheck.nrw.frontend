import { supabase } from './supabase';

/**
 * Completely removes a person's data from all related JSON fields and storage bucket
 * @param userId - The user's ID
 * @param personId - The UUID of the person to remove
 */
export const completelyRemovePerson = async (userId: string, personId: string) => {
  try {
    console.log(`🗑️ Completely removing person ${personId} from user ${userId}`);
    
    // 1. Remove from weitere_antragstellende_personen
    const { data: userData, error: userError } = await supabase
      .from('user_data')
      .select('weitere_antragstellende_personen, document_status, additional_documents')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error loading user data:', userError);
      throw userError;
    }

    // Update weitere_antragstellende_personen
    const weiterePersonen = userData?.weitere_antragstellende_personen || {};
    const updatedWeiterePersonen = { ...weiterePersonen };
    delete updatedWeiterePersonen[personId];

    // 2. Remove from additional_applicants_financials
    const { data: financialData, error: financialError } = await supabase
      .from('user_financials')
      .select('additional_applicants_financials')
      .eq('user_id', userId)
      .single();

    if (financialError && financialError.code !== 'PGRST116') {
      console.error('Error loading financial data:', financialError);
    }

    const additionalFinancials = financialData?.additional_applicants_financials || {};
    const updatedAdditionalFinancials = { ...additionalFinancials };
    delete updatedAdditionalFinancials[personId];

    // 3. Remove from document_status
    const documentStatus = userData?.document_status || {};
    const updatedDocumentStatus = { ...documentStatus };
    const applicantKey = `applicant_${personId}`;
    
    // Collect all files to delete from storage
    const filesToDelete: string[] = [];
    
    if (updatedDocumentStatus[applicantKey]) {
      console.log(`📁 Found document status for applicant ${applicantKey}:`, updatedDocumentStatus[applicantKey]);
      
      // Iterate through all document types for this applicant
      Object.values(updatedDocumentStatus[applicantKey]).forEach((files: any) => {
        if (Array.isArray(files)) {
          files.forEach((file: any) => {
            if (file.filePath) {
              filesToDelete.push(file.filePath);
              console.log(`📄 Found file to delete: ${file.filePath}`);
            }
          });
        }
      });
      
      // Remove the entire applicant section from document_status
      delete updatedDocumentStatus[applicantKey];
    } else {
      console.log(`📁 No document status found for applicant ${applicantKey}`);
    }

    // 4. Remove from additional_documents
    const additionalDocuments = userData?.additional_documents || {};
    const updatedAdditionalDocuments = { ...additionalDocuments };
    delete updatedAdditionalDocuments[applicantKey];

    // 5. Delete files from storage bucket
    if (filesToDelete.length > 0) {
      console.log(`🗑️ Deleting ${filesToDelete.length} files from storage for person ${personId}`);
      
      // Delete files in batches to avoid overwhelming the storage API
      const batchSize = 10;
      let storageErrors = 0;
      
      for (let i = 0; i < filesToDelete.length; i += batchSize) {
        const batch = filesToDelete.slice(i, i + batchSize);
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove(batch);
        
        if (storageError) {
          console.error('Error deleting files from storage:', storageError);
          storageErrors++;
          // Continue with other cleanup even if storage deletion fails
        }
      }
      
      if (storageErrors > 0) {
        console.warn(`⚠️ Failed to delete ${storageErrors} batches of files from storage for person ${personId}`);
      }
    }

    // 6. Delete the entire applicant folder structure from storage
    // This ensures empty folders are also removed
    const applicantFolderPath = `${userId}/applicant_${personId}`;
    console.log(`🗑️ Attempting to clean up applicant folder: ${applicantFolderPath}`);
    
    try {
      // First, try to list files in the applicant folder
      const { data: folderFiles, error: listError } = await supabase.storage
        .from('documents')
        .list(applicantFolderPath);
      
      if (listError) {
        console.error('Error listing files in applicant folder:', listError);
        console.log('This might be due to permissions or the folder not existing');
      } else if (folderFiles && folderFiles.length > 0) {
        console.log(`📁 Found ${folderFiles.length} files in applicant folder:`, folderFiles.map(f => f.name));
        
        // Delete any remaining files in the folder
        const remainingFiles = folderFiles.map(file => `${applicantFolderPath}/${file.name}`);
        console.log('🗑️ Deleting remaining files:', remainingFiles);
        
        const { error: deleteFolderError } = await supabase.storage
          .from('documents')
          .remove(remainingFiles);
        
        if (deleteFolderError) {
          console.error('Error deleting remaining files in applicant folder:', deleteFolderError);
        } else {
          console.log(`✅ Successfully deleted ${remainingFiles.length} remaining files from applicant folder`);
        }
      } else {
        console.log(`📁 No files found in applicant folder: ${applicantFolderPath}`);
      }
    } catch (error) {
      console.error('Error during folder cleanup:', error);
      // Continue with database cleanup even if folder deletion fails
    }
    
    // 7. Also try to delete any subfolders that might exist
    // This handles the case where files are stored in subfolders like {documentType}/
    try {
      const documentTypes = ['einkommenssteuererklaerung', 'lohn_gehaltsbescheinigungen', 'gehaltsabrechnung', 'einkommenssteuerbescheid', 'rentenbescheid', 'arbeitslosengeldbescheid', 'werbungskosten_nachweis', 'kinderbetreuungskosten_nachweis', 'unterhaltsverpflichtung_nachweis', 'unterhaltsleistungen_nachweis', 'krankengeld_nachweis', 'elterngeld_nachweis', 'guv_euer_nachweis', 'ausbildungsfoerderung_nachweis', 'sonstige_dokumente'];
      
      for (const docType of documentTypes) {
        const subfolderPath = `${applicantFolderPath}/${docType}`;
        console.log(`📁 Checking subfolder: ${subfolderPath}`);
        
        const { data: subfolderFiles, error: subfolderListError } = await supabase.storage
          .from('documents')
          .list(subfolderPath);
        
        if (!subfolderListError && subfolderFiles && subfolderFiles.length > 0) {
          console.log(`📁 Found ${subfolderFiles.length} files in subfolder ${docType}:`, subfolderFiles.map(f => f.name));
          
          const subfolderFilesToDelete = subfolderFiles.map(file => `${subfolderPath}/${file.name}`);
          const { error: deleteSubfolderError } = await supabase.storage
            .from('documents')
            .remove(subfolderFilesToDelete);
          
          if (deleteSubfolderError) {
            console.error(`Error deleting files in subfolder ${docType}:`, deleteSubfolderError);
          } else {
            console.log(`✅ Successfully deleted ${subfolderFilesToDelete.length} files from subfolder ${docType}`);
          }
        }
      }
    } catch (error) {
      console.error('Error during subfolder cleanup:', error);
    }

    // 8. Update all database records
    const updatePromises = [];

    // Update user_data
    updatePromises.push(
      supabase
        .from('user_data')
        .update({
          weitere_antragstellende_personen: Object.keys(updatedWeiterePersonen).length > 0 ? updatedWeiterePersonen : null,
          document_status: Object.keys(updatedDocumentStatus).length > 0 ? updatedDocumentStatus : null,
          additional_documents: Object.keys(updatedAdditionalDocuments).length > 0 ? updatedAdditionalDocuments : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    );

    // Update user_financials
    updatePromises.push(
      supabase
        .from('user_financials')
        .update({
          additional_applicants_financials: Object.keys(updatedAdditionalFinancials).length > 0 ? updatedAdditionalFinancials : null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
    );

    // Execute all updates
    const results = await Promise.all(updatePromises);
    
    // Check for errors
    results.forEach((result, index) => {
      if (result.error) {
        console.error(`Error in update ${index}:`, result.error);
        throw result.error;
      }
    });

    console.log(`✅ Successfully removed person ${personId} from all data sources`);
    
  } catch (error) {
    console.error('Error completely removing person:', error);
    throw error;
  }
}; 