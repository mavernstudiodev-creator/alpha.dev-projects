import { DocumentVerificationReport, HumanReviewRecord, User } from '../types';

export const DEMO_DATA_DISCLAIMER = "DEMO DATASET - SIMULATED SCIENTIFIC CLAIM AUDIT BENCHMARK";

export const CURRENT_USER: User = {
  id: 'usr_01',
  name: 'Dr. Elena Vance, Ph.D.',
  email: 'e.vance@citeverify.org',
  role: 'lead_investigator',
  institution: 'Institute for Research Integrity & Metascience',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};

export const MOCK_ACADEMIC_RESOLVERS = [
  {
    name: 'Crossref',
    id: 'crossref',
    status: 'connected',
    indexedWorks: '154 Million',
    latency: '42ms',
    description: 'DOI authority, publisher metadata, citation relations, and funding indices.',
    endpoint: 'https://api.crossref.org/works',
    iconName: 'crossref'
  },
  {
    name: 'OpenAlex',
    id: 'openalex',
    status: 'connected',
    indexedWorks: '250 Million',
    latency: '68ms',
    description: 'Global open graph of academic entities, citation graphs, and venue metadata.',
    endpoint: 'https://api.openalex.org',
    iconName: 'openalex'
  },
  {
    name: 'Semantic Scholar',
    id: 'semantic_scholar',
    status: 'connected',
    indexedWorks: '215 Million',
    latency: '91ms',
    description: 'AI-driven scientific literature graph with citation intent and methodology extraction.',
    endpoint: 'https://api.semanticscholar.org/v1',
    iconName: 'semanticscholar'
  },
  {
    name: 'Europe PMC',
    id: 'europe_pmc',
    status: 'connected',
    indexedWorks: '44 Million',
    latency: '53ms',
    description: 'Full-text open-access biomedical literature, preprints, and clinical evidence.',
    endpoint: 'https://europepmc.org/RestWebService',
    iconName: 'europepmc'
  },
  {
    name: 'arXiv e-Print',
    id: 'arxiv',
    status: 'connected',
    indexedWorks: '2.4 Million',
    latency: '85ms',
    description: 'Physics, computer science, quantitative biology, and mathematics preprints.',
    endpoint: 'https://export.arxiv.org/api',
    iconName: 'arxiv'
  },
];

export const MOCK_DOCUMENTS: DocumentVerificationReport[] = [
  {
    document_id: 'DOC-A9F82B01',
    filename: 'CRISPR_Base_Editing_HSC_Analysis_Nature2025.pdf',
    file_size: '3.4 MB',
    total_pages: 14,
    uploaded_at: '2026-11-18T14:32:00Z',
    status: 'requires_review',
    summary: {
      total_claims: 6,
      supported: 2,
      partially_supported: 1,
      unsupported: 1,
      contradictory: 1,
      possibly_outdated: 1,
      insufficient_evidence: 0,
      average_confidence: 0.88,
    },
    results: [
      {
        claim_id: 'CLM-001',
        claim_statement: 'Adenine base editors (ABEs) achieve greater than 78% on-target editing efficiency in primary human CD34+ hematopoietic stem cells without detectable double-stranded DNA breaks.',
        status: 'supported',
        confidence_score: 0.94,
        explanation: 'Ground-truth evidence directly corroborates the assertion. Across 3 independent cohorts in the cited study, mean ABE on-target efficiency was recorded at 81.4% ± 3.2% with negligible DSBs measured by high-throughput translocation sequencing (HTGTS).',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: false,
        review_status: 'confirmed',
        reviewed_by: 'Dr. Elena Vance, Ph.D.',
        reviewed_at: '2026-11-18T16:10:00Z',
        human_notes: 'Verified against Table 2 and supplementary HTGTS assay figures in Gaudelli et al. 2020.',
        matched_citations: [
          {
            key: '1',
            raw_text: 'Gaudelli, N. M. et al. Directed evolution of adenine base editors with expanded targeting scope and high efficiency. Nature Biotechnology 38, 892-900 (2020).',
            title: 'Directed evolution of adenine base editors with expanded targeting scope and high efficiency',
            authors: ['Gaudelli NM', 'Lam DK', 'Rees HA', 'Solá-Esteves NM', 'Barrera LA', 'Born DA', 'Edwards A'],
            year: 2020,
            journal: 'Nature Biotechnology',
            doi: '10.1038/s41587-020-0491-6',
            resolved: true,
            source_url: 'https://doi.org/10.1038/s41587-020-0491-6'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-8821',
            source_work_title: 'Directed evolution of adenine base editors with expanded targeting scope and high efficiency',
            source_database: 'europe_pmc',
            source_doi: '10.1038/s41587-020-0491-6',
            source_url: 'https://europepmc.org/article/MED/32284586',
            evidence_type: 'full_text',
            page_number: 4,
            section: 'Results: Primary HSC Transduction Assays',
            passage_text: 'ABE8e exhibited robust editing at the BCL11A enhancer and HBG promoter targets in primary human CD34+ HSPCs, yielding 78-84% target base conversion (mean 81.4%, n = 5 biological donors) while indel frequencies remained at background levels (<0.4%).',
            relevance_score: 0.97,
            retrieved_at: '2026-11-18T14:32:15Z'
          }
        ]
      },
      {
        claim_id: 'CLM-002',
        claim_statement: 'Off-target guide RNA-dependent transcriptome mutagenesis was undetectable (<0.01%) across global RNA sequencing in treated human stem cells.',
        status: 'contradictory',
        confidence_score: 0.91,
        explanation: 'Direct contradiction detected. The referenced source paper explicitly documented transcriptome-wide off-target adenosine deamination occurring between 1.4% and 3.8% across hundreds of non-targeted transcripts in CD34+ cell lines.',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: true,
        review_status: 'pending',
        matched_citations: [
          {
            key: '3',
            raw_text: 'Kim, H. S. et al. Transcriptome-wide off-target deamination induced by engineered deaminase domains. Science 364, 289-293 (2021).',
            title: 'Transcriptome-wide off-target deamination induced by engineered deaminase domains',
            authors: ['Kim HS', 'Choi J', 'Lee H', 'Park J', 'Kim JS'],
            year: 2021,
            journal: 'Science',
            doi: '10.1126/science.aay9902',
            resolved: true,
            source_url: 'https://doi.org/10.1126/science.aay9902'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-4912',
            source_work_title: 'Transcriptome-wide off-target deamination induced by engineered deaminase domains',
            source_database: 'crossref',
            source_doi: '10.1126/science.aay9902',
            source_url: 'https://doi.org/10.1126/science.aay9902',
            evidence_type: 'full_text',
            page_number: 291,
            section: 'Discussion & Quantification of RNA Off-Targets',
            passage_text: 'Contrary to initial expectations of near-zero unintended edits, deep RNA-seq revealed that wild-type TadA-derived variants induce tens of thousands of off-target RNA single nucleotide variations, with variant allele frequencies ranging between 1.4% and 3.8% in primary human stem and progenitor cells.',
            relevance_score: 0.94,
            retrieved_at: '2026-11-18T14:32:18Z'
          }
        ]
      },
      {
        claim_id: 'CLM-003',
        claim_statement: 'Lipid nanoparticle encapsulation of base editor mRNA completely eliminates anti-Cas9 immunogenicity in human clinical trials.',
        status: 'partially_supported',
        confidence_score: 0.77,
        explanation: 'The cited investigation demonstrated substantial reduction (82% reduction in humoral anti-Cas9 antibody titers), but reported that pre-existing antigen-specific memory CD8+ T-cell activation persisted in 34% of subjects, failing to validate "complete elimination".',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: true,
        review_status: 'pending',
        matched_citations: [
          {
            key: '7',
            raw_text: 'Yin, H. et al. Non-viral in vivo gene editing with lipid nanoparticles and assessment of host immune tolerance. Cell Stem Cell 28, 1420-1432 (2021).',
            title: 'Non-viral in vivo gene editing with lipid nanoparticles and assessment of host immune tolerance',
            authors: ['Yin H', 'Bogdanove AJ', 'Zhang F', 'Anderson DG'],
            year: 2021,
            journal: 'Cell Stem Cell',
            doi: '10.1016/j.stem.2021.05.012',
            resolved: true,
            source_url: 'https://doi.org/10.1016/j.stem.2021.05.012'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-1029',
            source_work_title: 'Non-viral in vivo gene editing with lipid nanoparticles and assessment of host immune tolerance',
            source_database: 'europe_pmc',
            source_doi: '10.1016/j.stem.2021.05.012',
            source_url: 'https://europepmc.org/article/MED/34115982',
            evidence_type: 'full_text',
            page_number: 1428,
            section: 'Immunogenicity of Transient mRNA Delivery',
            passage_text: 'Transient LNP delivery significantly blunted humoral antibody production against Cas9 (82% reduction relative to AAV9 vectors, P < 0.001); however, pre-existing CD8+ cytotoxic T-cell memory responses were detected in 6 of 18 human peripheral blood mononuclear cell samples tested.',
            relevance_score: 0.89,
            retrieved_at: '2026-11-18T14:32:20Z'
          }
        ]
      },
      {
        claim_id: 'CLM-004',
        claim_statement: 'Post-electroporation stem cell viability exceeded 95% at 72 hours across all donor phenotypes.',
        status: 'unsupported',
        confidence_score: 0.89,
        explanation: 'Reference [11] examined immortalized K562 erythroleukemia cell lines, containing zero measurements or viability data for primary human CD34+ donor cells or 72-hour survival benchmarks.',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: true,
        review_status: 'flagged',
        human_notes: 'Auditor Flag: Incorrect reference citation cited in Section 3.2. Needs author clarification.',
        reviewed_by: 'Dr. Elena Vance, Ph.D.',
        reviewed_at: '2026-11-18T16:25:00Z',
        matched_citations: [
          {
            key: '11',
            raw_text: 'Miller, J. C. et al. High-efficiency electroporation parameters for suspension cell cultures. Biotechnology Progress 34, 112-120 (2018).',
            title: 'High-efficiency electroporation parameters for suspension cell cultures',
            authors: ['Miller JC', 'Holms PR', 'Zhang L'],
            year: 2018,
            journal: 'Biotechnology Progress',
            doi: '10.1002/btpr.2589',
            resolved: true,
            source_url: 'https://doi.org/10.1002/btpr.2589'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-3104',
            source_work_title: 'High-efficiency electroporation parameters for suspension cell cultures',
            source_database: 'crossref',
            source_doi: '10.1002/btpr.2589',
            source_url: 'https://doi.org/10.1002/btpr.2589',
            evidence_type: 'full_text',
            page_number: 114,
            section: 'Materials and Methods: Model Cell Line Maintenance',
            passage_text: 'All electro-transfection optimizations were conducted strictly in suspension K562 and CHO-K1 cell lines maintained in RPMI-1640 medium. Primary human cells or stem cell lineages were not evaluated in this study.',
            relevance_score: 0.92,
            retrieved_at: '2026-11-18T14:32:22Z'
          }
        ]
      },
      {
        claim_id: 'CLM-005',
        claim_statement: 'Lentiviral vector gene addition remains the undisputed gold standard for human gene therapy with no clinical risk of insertional mutagenesis.',
        status: 'possibly_outdated',
        confidence_score: 0.86,
        explanation: 'Superseded paradigm detected. While 2016 retrospective reviews supported this statement, subsequent 2024 Phase III trials (NEJM 2024, DOI: 10.1056/NEJMoa230811) reported delayed clonal expansion and MDS in 3 patients, leading regulatory agencies to issue safety revisions favoring non-integrating nucleases.',
        is_abstract_only: false,
        is_outdated_risk: true,
        newer_work_details: 'St. Jude Children’s Research Hospital Clinical Cohort 2024 (NEJM, DOI: 10.1056/NEJMoa230811) documented clonal insertional dominance in long-term lentiviral monitoring.',
        requires_human_review: true,
        review_status: 'pending',
        matched_citations: [
          {
            key: '14',
            raw_text: 'Naldini, L. Gene therapy returns to centre stage. Nature 526, 351-360 (2015).',
            title: 'Gene therapy returns to centre stage',
            authors: ['Naldini L'],
            year: 2015,
            journal: 'Nature',
            doi: '10.1038/nature15818',
            resolved: true,
            source_url: 'https://doi.org/10.1038/nature15818'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-6211',
            source_work_title: 'Long-Term Safety Outcomes Following Hematopoietic Stem-Cell Gene Addition',
            source_database: 'europe_pmc',
            source_doi: '10.1056/NEJMoa230811',
            source_url: 'https://doi.org/10.1056/NEJMoa230811',
            evidence_type: 'full_text',
            page_number: 18,
            section: 'Long-term Surveillance & Clonal Tracking',
            passage_text: 'Between years 5 and 7 post-infusion, integration-site analysis revealed recurrent vector insertions in the proto-oncogene PRDM16 and HMGA2 loci, resulting in oligoclonal skewing that alters prior assumptions of insertional benignity.',
            relevance_score: 0.91,
            retrieved_at: '2026-11-18T14:32:25Z'
          }
        ]
      },
      {
        claim_id: 'CLM-006',
        claim_statement: 'Synthetic guide RNAs with 2\'-O-methyl 3\'-phosphorothioate end modifications significantly resist exonucleolytic decay in primary human serum.',
        status: 'supported',
        confidence_score: 0.95,
        explanation: 'Robust agreement found. Cited full-text passage confirms half-life increase from 12 minutes to greater than 18 hours in 100% human active serum.',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: false,
        review_status: 'confirmed',
        reviewed_by: 'Automated Pipeline (High Concordance Threshold)',
        reviewed_at: '2026-11-18T14:33:00Z',
        matched_citations: [
          {
            key: '18',
            raw_text: 'Hendel, A. et al. Chemically modified guide RNAs enhance CRISPR-Cas genome editing in human primary cells. Nature Biotechnology 33, 985-989 (2015).',
            title: 'Chemically modified guide RNAs enhance CRISPR-Cas genome editing in human primary cells',
            authors: ['Hendel A', 'Bak RO', 'Clark JT', 'Bao G', 'Porteus MH'],
            year: 2015,
            journal: 'Nature Biotechnology',
            doi: '10.1038/nbt.3290',
            resolved: true,
            source_url: 'https://doi.org/10.1038/nbt.3290'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-7819',
            source_work_title: 'Chemically modified guide RNAs enhance CRISPR-Cas genome editing in human primary cells',
            source_database: 'crossref',
            source_doi: '10.1038/nbt.3290',
            source_url: 'https://doi.org/10.1038/nbt.3290',
            evidence_type: 'full_text',
            page_number: 986,
            section: 'End-protection and serum stability assay',
            passage_text: 'Incubation of unmodified sgRNAs in active human serum led to rapid degradation within 15 minutes. In contrast, sgRNAs modified with 2\'-O-methyl 3\'-phosphorothioate at both termini maintained structural integrity past 18 hours.',
            relevance_score: 0.98,
            retrieved_at: '2026-11-18T14:32:28Z'
          }
        ]
      }
    ],
    bibliography: [
      {
        key: '1',
        raw_text: 'Gaudelli, N. M. et al. Directed evolution of adenine base editors with expanded targeting scope and high efficiency. Nature Biotechnology 38, 892-900 (2020).',
        title: 'Directed evolution of adenine base editors with expanded targeting scope and high efficiency',
        authors: ['Gaudelli NM', 'Lam DK', 'Rees HA', 'Solá-Esteves NM', 'Barrera LA'],
        year: 2020,
        journal: 'Nature Biotechnology',
        doi: '10.1038/s41587-020-0491-6',
        resolved: true,
        source_url: 'https://doi.org/10.1038/s41587-020-0491-6'
      },
      {
        key: '3',
        raw_text: 'Kim, H. S. et al. Transcriptome-wide off-target deamination induced by engineered deaminase domains. Science 364, 289-293 (2021).',
        title: 'Transcriptome-wide off-target deamination induced by engineered deaminase domains',
        authors: ['Kim HS', 'Choi J', 'Lee H', 'Park J', 'Kim JS'],
        year: 2021,
        journal: 'Science',
        doi: '10.1126/science.aay9902',
        resolved: true,
        source_url: 'https://doi.org/10.1126/science.aay9902'
      },
      {
        key: '7',
        raw_text: 'Yin, H. et al. Non-viral in vivo gene editing with lipid nanoparticles and assessment of host immune tolerance. Cell Stem Cell 28, 1420-1432 (2021).',
        title: 'Non-viral in vivo gene editing with lipid nanoparticles and assessment of host immune tolerance',
        authors: ['Yin H', 'Bogdanove AJ', 'Zhang F', 'Anderson DG'],
        year: 2021,
        journal: 'Cell Stem Cell',
        doi: '10.1016/j.stem.2021.05.012',
        resolved: true,
        source_url: 'https://doi.org/10.1016/j.stem.2021.05.012'
      },
      {
        key: '11',
        raw_text: 'Miller, J. C. et al. High-efficiency electroporation parameters for suspension cell cultures. Biotechnology Progress 34, 112-120 (2018).',
        title: 'High-efficiency electroporation parameters for suspension cell cultures',
        authors: ['Miller JC', 'Holms PR', 'Zhang L'],
        year: 2018,
        journal: 'Biotechnology Progress',
        doi: '10.1002/btpr.2589',
        resolved: true,
        source_url: 'https://doi.org/10.1002/btpr.2589'
      },
      {
        key: '14',
        raw_text: 'Naldini, L. Gene therapy returns to centre stage. Nature 526, 351-360 (2015).',
        title: 'Gene therapy returns to centre stage',
        authors: ['Naldini L'],
        year: 2015,
        journal: 'Nature',
        doi: '10.1038/nature15818',
        resolved: true,
        source_url: 'https://doi.org/10.1038/nature15818'
      },
      {
        key: '18',
        raw_text: 'Hendel, A. et al. Chemically modified guide RNAs enhance CRISPR-Cas genome editing in human primary cells. Nature Biotechnology 33, 985-989 (2015).',
        title: 'Chemically modified guide RNAs enhance CRISPR-Cas genome editing in human primary cells',
        authors: ['Hendel A', 'Bak RO', 'Clark JT', 'Bao G', 'Porteus MH'],
        year: 2015,
        journal: 'Nature Biotechnology',
        doi: '10.1038/nbt.3290',
        resolved: true,
        source_url: 'https://doi.org/10.1038/nbt.3290'
      }
    ]
  },
  {
    document_id: 'DOC-B4E91C02',
    filename: 'mRNA_Lipid_Nanoparticles_TCell_ImmunoOncol.pdf',
    file_size: '5.1 MB',
    total_pages: 22,
    uploaded_at: '2026-11-17T11:20:00Z',
    status: 'completed',
    summary: {
      total_claims: 5,
      supported: 2,
      partially_supported: 1,
      unsupported: 0,
      contradictory: 0,
      possibly_outdated: 0,
      insufficient_evidence: 2,
      average_confidence: 0.81,
    },
    results: [
      {
        claim_id: 'CLM-101',
        claim_statement: 'Proprietary ionizable lipid ALC-0315 maintains non-target splenic accumulation below 1.2% in non-human primate biodistribution assays.',
        status: 'insufficient_evidence',
        confidence_score: 0.38,
        explanation: 'Scientific Abstention Rule Triggered: The referenced citation corresponds to a closed patent application (WO2021/092023). Full-text tables and primary animal biodistribution readouts could not be retrieved across OpenAlex, Europe PMC, or Crossref APIs. The system refrains from speculative verification.',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: true,
        review_status: 'pending',
        matched_citations: [
          {
            key: '4',
            raw_text: 'World Intellectual Property Organization. Novel ionizable lipidoids for nucleic acid formulation. Patent WO2021092023A1 (2021).',
            title: 'Novel ionizable lipidoids for nucleic acid formulation',
            authors: ['Patel S', 'Vogel AB'],
            year: 2021,
            journal: 'WIPO Patent Gazette',
            resolved: false,
            source_url: 'https://patents.google.com/patent/WO2021092023A1'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-8910',
            source_work_title: 'Novel ionizable lipidoids for nucleic acid formulation',
            source_database: 'crossref',
            source_url: 'https://patents.google.com/patent/WO2021092023A1',
            evidence_type: 'metadata_only',
            passage_text: 'Bibliographic metadata indexed without open access full-text deposition or quantitative bio-distribution tables. Content gated by proprietary registry.',
            relevance_score: 0.40,
            retrieved_at: '2026-11-17T11:21:05Z'
          }
        ]
      },
      {
        claim_id: 'CLM-102',
        claim_statement: 'CAR-T cell generation in vivo yielded 38% circulating CD3+ CAR+ cells within 48 hours of systemic lipid nanoparticle injection.',
        status: 'supported',
        confidence_score: 0.93,
        explanation: 'Corroborated by Rurik et al. Science 2022. Flow cytometry of peripheral blood at 48 hours revealed 37.8% ± 4.1% CD3+CAR+ circulating T-cells.',
        is_abstract_only: false,
        is_outdated_risk: false,
        requires_human_review: false,
        review_status: 'confirmed',
        reviewed_by: 'Dr. Elena Vance, Ph.D.',
        reviewed_at: '2026-11-17T14:00:00Z',
        matched_citations: [
          {
            key: '1',
            raw_text: 'Rurik, J. G. et al. CAR T cells produced in vivo to treat cardiac injury. Science 375, 91-96 (2022).',
            title: 'CAR T cells produced in vivo to treat cardiac injury',
            authors: ['Rurik JG', 'Aghajanian H', 'Epstein JA'],
            year: 2022,
            journal: 'Science',
            doi: '10.1126/science.abm0594',
            resolved: true,
            source_url: 'https://doi.org/10.1126/science.abm0594'
          }
        ],
        evidence_items: [
          {
            passage_id: 'EV-9901',
            source_work_title: 'CAR T cells produced in vivo to treat cardiac injury',
            source_database: 'europe_pmc',
            source_doi: '10.1126/science.abm0594',
            evidence_type: 'full_text',
            page_number: 93,
            section: 'In vivo Reprogramming Dynamics',
            passage_text: 'Analysis of peripheral blood mononuclear cells 48 hours after single intravenous infusion showed that 37.8% of total CD3+ T cells were engineered to express the anti-FAP CAR receptor.',
            relevance_score: 0.96,
            retrieved_at: '2026-11-17T11:21:12Z'
          }
        ]
      }
    ],
    bibliography: [
      {
        key: '1',
        raw_text: 'Rurik, J. G. et al. CAR T cells produced in vivo to treat cardiac injury. Science 375, 91-96 (2022).',
        title: 'CAR T cells produced in vivo to treat cardiac injury',
        authors: ['Rurik JG', 'Aghajanian H', 'Epstein JA'],
        year: 2022,
        journal: 'Science',
        doi: '10.1126/science.abm0594',
        resolved: true,
        source_url: 'https://doi.org/10.1126/science.abm0594'
      },
      {
        key: '4',
        raw_text: 'World Intellectual Property Organization. Novel ionizable lipidoids for nucleic acid formulation. Patent WO2021092023A1 (2021).',
        title: 'Novel ionizable lipidoids for nucleic acid formulation',
        authors: ['Patel S', 'Vogel AB'],
        year: 2021,
        journal: 'WIPO Patent Gazette',
        resolved: false,
        source_url: 'https://patents.google.com/patent/WO2021092023A1'
      }
    ]
  },
  {
    document_id: 'DOC-C7D33F03',
    filename: 'CryoEM_Structure_NaV1.7_Peptide_Toxin.pdf',
    file_size: '4.8 MB',
    total_pages: 18,
    uploaded_at: '2026-11-15T09:45:00Z',
    status: 'completed',
    summary: {
      total_claims: 4,
      supported: 3,
      partially_supported: 1,
      unsupported: 0,
      contradictory: 0,
      possibly_outdated: 0,
      insufficient_evidence: 0,
      average_confidence: 0.92,
    },
    results: [],
    bibliography: []
  },
  {
    document_id: 'DOC-D2A44E04',
    filename: 'MultiOmics_Microglial_Activation_Neurodegen.pdf',
    file_size: '6.2 MB',
    total_pages: 28,
    uploaded_at: '2026-11-12T16:15:00Z',
    status: 'completed',
    summary: {
      total_claims: 8,
      supported: 5,
      partially_supported: 1,
      unsupported: 1,
      contradictory: 0,
      possibly_outdated: 1,
      insufficient_evidence: 0,
      average_confidence: 0.89,
    },
    results: [],
    bibliography: []
  }
];

export const MOCK_HUMAN_REVIEWS: HumanReviewRecord[] = [
  {
    id: 'REV-001',
    document_id: 'DOC-A9F82B01',
    claim_id: 'CLM-001',
    decision: 'confirmed',
    notes: 'Concordant with supplementary data in Gaudelli et al. 2020.',
    reviewed_at: '2026-11-18T16:10:00Z',
    reviewer_name: 'Dr. Elena Vance, Ph.D.',
  },
  {
    id: 'REV-002',
    document_id: 'DOC-A9F82B01',
    claim_id: 'CLM-004',
    decision: 'flagged',
    notes: 'Incorrect paper cited. Reference [11] is for suspension CHO/K562 cells, not primary CD34+ cells.',
    reviewed_at: '2026-11-18T16:25:00Z',
    reviewer_name: 'Dr. Elena Vance, Ph.D.',
  },
  {
    id: 'REV-003',
    document_id: 'DOC-B4E91C02',
    claim_id: 'CLM-102',
    decision: 'confirmed',
    notes: 'Rurik et al. 2022 validates 38% in vivo reprogramming.',
    reviewed_at: '2026-11-17T14:00:00Z',
    reviewer_name: 'Dr. Elena Vance, Ph.D.',
  }
];
