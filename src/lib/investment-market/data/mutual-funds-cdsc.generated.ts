/** Auto-generated from CDSC registered mutual funds (scripts/cdsc-mf.html). */
import type { ClosedEndedMutualFund, OpenEndedMutualFund } from "@/lib/investment-market/types";

function openMf(
  key: string,
  fundName: string,
  fundManager: string,
  category: string,
  sipSupported: boolean,
  demoNavNpr: number,
): OpenEndedMutualFund {
  return { universe: "open_end_mf", key, fundName, fundManager, category, sipSupported, demoNavNpr };
}

function closedMf(
  key: string,
  ticker: string,
  fundName: string,
  category: string,
  demoLastPriceNpr: number,
): ClosedEndedMutualFund {
  return { universe: "closed_end_mf", key, ticker, fundName, category, demoLastPriceNpr };
}

export const CDSC_OPEN_ENDED_FUNDS: readonly OpenEndedMutualFund[] = [
  openMf("open_end_mf:CSBY", "CITIZENS SADABAHAR YOJANA (OPEN-ENDED MUTUAL FUND)", "Citizens Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:GSYM", "GARIMA SUBARNA YOJANA (OPEN ENDED MUTUAL FUND)", "Garima Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:KSLY", "KUMARI SUNAULO LAGANI YOJANA - OPEN ENDED MUTUAL FUND", "Kumari Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:SLK", "SHUBHA LAXMI KOSH - OPEN ENDED MUTUAL FUND", "LAXMI Sunrise Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:MSIP", "MACHHAPUCHCHHRE SIP YOJANA (OPEN-ENDED MUTUAL FUND)", "Machhapuchchhre Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NFCF", "NABIL FLEXI CAP FUND - OPEN ENDED MUTUAL FUND", "NABIL Investment Banking Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NI31", "NI 31 (OPEN-ENDED MUTUAL FUND)", "NABIL Investment Banking Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NIBLSF", "NIBL SAHABHAGITA FUND - OPEN ENDED MUTUAL FUND", "NIMB ACE Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NICADF", "NIC ASIA DYANMIC DEPT FUND- OPEN ENDED MUTUAL FUND", "NIC ASIA Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NICAES", "NIC ASIA EQUITY LINKED INVESTMENT SCHEME (OPEN-ENDED MUTUAL FUND)", "NIC ASIA Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:NMBSBFE", "NMB SARAL BACHAT FUND-E (OPEN ENDED MUTUAL FUND)", "NMB Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:PSIS", "PRABHU SYSTEMATIC INVESTMENT SCHEME (OPEN ENDED MUTUAL FUND)", "Prabhu Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:SFF", "SANIMA FLEXI FUND - OPEN ENDED MUTUAL FUND", "Sanima Capital Limited", "Open-ended mutual fund", true, 100),
  openMf("open_end_mf:SSIS", "SIDDHARTHA SYSTEMATIC INVESTMENT SCHEME", "Siddhartha Capital Limited", "Open-ended mutual fund", true, 100),
];

export const CDSC_CLOSED_ENDED_FUNDS: readonly ClosedEndedMutualFund[] = [
  closedMf("closed_end_mf:CMF1", "CMF1", "CITIZENS MUTUAL FUND 1- MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:CMF2", "CMF2", "CITIZENS MUTUAL FUND 2", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:C30MF", "C30MF", "CITIZENS SUPER 30 MUTUAL FUND (CLOSE ENDED)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:CSY", "CSY", "CITIZENS SANTULIT YOJANA (CLOSE-ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:GSY", "GSY", "GARIMA SAMRIDDHI YOJANA - CLOSE ENDED MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:GIBF1", "GIBF1", "GLOBAL IME BALANCE FUND-1", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:GBIMESY2", "GBIMESY2", "GLOBAL IME SAMMUNAT YOJANA - 2 (CLOSE ENDED MUTAUL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:H8020", "H8020", "HIMALAYAN 80-20 (CLOSE-ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:HLICF", "HLICF", "HLI LARGE CAP FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:KEF", "KEF", "KUMARI EQUITY FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:KDBY", "KDBY", "KUMARI DHANABRIDDHI YOJANA - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:KSY", "KSY", "KUMARI SABAL YOJANA (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:LUK", "LUK", "LAXMI UNNATI KOSH - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:LVF2", "LVF2", "LAXMI VALUE FUND - II (CLOSED ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:MBLEF", "MBLEF", "MBL EQUITY FUND (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:MMF1", "MMF1", "MEGA MUTUAL FUND-1", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:MNMF1", "MNMF1", "MUKTINATH MUTUAL FUND 1 (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NBF2", "NBF2", "NABIL BALANCED FUND-2 MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NBF3", "NBF3", "NABIL BALANCE FUND-3", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NIBSF2", "NIBSF2", "NIBL SAMRIDDHI FUND 2- MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NSY", "NSY", "NEPAL LIFE SAMRIDDHI LAGANI YOJANA (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NIBLGF", "NIBLGF", "NIBL GROWTH FUND- CLOSE ENDED MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NICGF2", "NICGF2", "NIC ASIA GROWTH FUND - 2 (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NICGF", "NICGF", "NIC ASIA GROWTH FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NICBF", "NICBF", "NIC ASIA BALANCED FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NICFC", "NICFC", "NIC ASIA FLEXI CAP FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NICSF", "NICSF", "NIC ASIA SELECT- 30 (INDEX FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NIBLSTF", "NIBLSTF", "NIBL STABLE FUND (CLOSE-ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NMB50", "NMB50", "NMB 50 (MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NSIF2", "NSIF2", "NMB SULAV INVESTMENT FUND- 2 (MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:NMBHF2", "NMBHF2", "NMB HYBRID FUND L - II (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:PSF", "PSF", "PRABHU SELECT FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:PRSF", "PRSF", "PRABHU SMART FUND - CLOSE ENDED MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:RMF1", "RMF1", "RBB MUTUAL FUND-1", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:RMF2", "RMF2", "RBB MUTUAL FUND 2", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:RBBF40", "RBBF40", "RBB FOCUS 40 (CLOSE-ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:RSY", "RSY", "RELIABLE SAMRIDDHI YOJANA (CLOSE ENDED MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SLCF", "SLCF", "SANIMA LARGE CAP FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SAGF", "SAGF", "SANIMA GROWTH FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SIGS2", "SIGS2", "SIDDHARTHA INVESTMENT GROWTH SCHEME-2 - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SIGS3", "SIGS3", "SIDDHARTHA INVESTMENT GROWTH SCHEME - 3 (MUTUAL FUND)", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SEF", "SEF", "SIDDHARTHA EQUITY FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SFMF", "SFMF", "SUNRISE FIRST MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SBCF", "SBCF", "SUNRISE BLUECHIP FUND- MUTUAL FUND", "Closed-ended mutual fund", 100),
  closedMf("closed_end_mf:SFEF", "SFEF", "SUNRISE FOCUSED EQUITY FUND - MUTUAL FUND", "Closed-ended mutual fund", 100),
];

export const CDSC_OPEN_MF_COUNT = 14 as const;
export const CDSC_CLOSED_MF_COUNT = 45 as const;
