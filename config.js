// Configuration file for IGV server
module.exports = {
  // Server port (will be auto-detected if not specified)
  port: process.env.PORT || 8080,

  // Data directory - where IGV files are stored
  // By default, use the 'data' directory in user's home
  dataDir: process.env.DATA_DIR || process.env.HOME + '/igv_data',

  // Allow directory listing
  allowDirectoryListing: true,

  // Allowed file extensions for security
  allowedExtensions: [
    '.bam', '.bai', '.cram', '.crai',
    '.vcf', '.vcf.gz', '.tbi',
    '.bed', '.bed.gz',
    '.gff', '.gff3', '.gtf',
    '.fa', '.fasta', '.fai',
    '.bw', '.bigwig', '.bigWig',
    '.wig', '.bedGraph',
    '.json', '.xml'
  ],

  // IGV.js version to use
  igvVersion: '2.15.11'
};
