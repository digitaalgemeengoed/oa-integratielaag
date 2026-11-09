/**
 * Het manifest van de invoegtoepassing voor Word, Excel en PowerPoint, met
 * het adres van deze omgeving erin. In het programma: Invoegtoepassingen →
 * Mijn invoegtoepassingen → Mijn invoegtoepassing uploaden, en kies dit
 * bestand. Welke versie van Office.js minimaal nodig is, controleert het
 * takenvenster zelf per programma (WordApi 1.3, ExcelApi 1.9,
 * PowerPointApi 1.4); in het manifest zou één eis voor alle drie gelden.
 * Wel in het manifest: SharedRuntime 1.1, voor de knoppen op het tabblad
 * Assistent (Word vanaf versie 2205, Excel 2002, PowerPoint 2102, en de
 * webversies).
 */
const ID = "b600d63a-a8ab-46cd-9f8d-c60b6e9cab00";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const HOSTS = ["Document", "Workbook", "Presentation"] as const;

/**
 * De knoppen op het tabblad Assistent, zoals in de demo (MIRA). Ze roepen
 * een functie aan in het takenvenster (gedeelde runtime, SharedRuntime 1.1):
 * het venster gaat open en toont de module.
 */
const KNOPPEN = {
  paneel: { label: "Paneel", uitleg: "Het paneel van de assistent tonen of verbergen." },
  ovz: { label: "Overzicht", uitleg: "Status, versie en wat er nog open staat." },
  ond: { label: "Onderdelen", uitleg: "Wat van elders komt. Volgt in het prototype." },
  meta: { label: "Metadateren", uitleg: "Kenmerken van het stuk, registreren en vastleggen." },
  toeg: { label: "Toegankelijkheid", uitleg: "Structuur en alternatieve tekst." },
  anon: { label: "Anonimiseren", uitleg: "Persoonsgegevens vinden en afschermen; eerst een voorbeeld, dan bevestigen." },
  clas: { label: "Classificeren", uitleg: "Openbaarheid en bewaring. Volgt in het prototype." },
  waar: { label: "Waarmerken", uitleg: "Authenticiteit en integriteit van een versie. Volgt in het prototype." },
  flow: { label: "Workflow", uitleg: "Stappen van de procedure. Volgt in het prototype." },
  beoordelen: { label: "Beoordelen", uitleg: "Het stuk beoordelen op toegankelijkheid." },
  "anon-selectie": { label: "Anonimiseer selectie", uitleg: "De geselecteerde tekst als persoonsgegeven vervangen door een plaatshouder (voorvertoning)." },
} as const;
type Knop = keyof typeof KNOPPEN;
const GROEPEN: [string, string, Knop[]][] = [
  ["OA.G.Paneel", "Paneel", ["paneel"]],
  ["OA.G.Modules", "Modules", ["ovz", "ond", "meta", "toeg", "anon", "clas", "waar", "flow"]],
  ["OA.G.Controleren", "Controleren", ["beoordelen", "anon-selectie"]],
];

const icoon = (id: string) => `<Icon>
                      <bt:Image size="16" resid="OA.I.${id}.16"/>
                      <bt:Image size="32" resid="OA.I.${id}.32"/>
                      <bt:Image size="80" resid="OA.I.${id}.80"/>
                    </Icon>`;

/** De functie in het takenvenster (word/taskpane.ts): oa_<id>, met _ in plaats van -. */
const functie = (id: Knop) => `oa_${id.replace(/-/g, "_")}`;

const knop = (id: Knop, voorvoegsel = "OA.K") => `
                  <Control xsi:type="Button" id="${voorvoegsel}.${id}">
                    <Label resid="OA.L.${id}"/>
                    <Supertip>
                      <Title resid="OA.L.${id}"/>
                      <Description resid="OA.U.${id}"/>
                    </Supertip>
                    ${icoon(id)}
                    <Action xsi:type="ExecuteFunction">
                      <FunctionName>${functie(id)}</FunctionName>
                    </Action>
                  </Control>`;

const hostBlok = (h: (typeof HOSTS)[number]) => `
      <Host xsi:type="${h}">
        <Runtimes>
          <Runtime resid="OA.Taakvenster.Url" lifetime="long"/>
        </Runtimes>
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="OA.Titel"/>
            <Description resid="OA.Uitleg"/>
            <LearnMoreUrl resid="OA.Meer"/>
          </GetStarted>
          <FunctionFile resid="OA.Taakvenster.Url"/>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <CustomTab id="OA.Tab">${GROEPEN.map(
              ([id, label, knoppen]) => `
              <Group id="${id}">
                <Label resid="${id}"/>
                ${icoon(knoppen[0])}${knoppen.map((k) => knop(k)).join("")}
              </Group>`,
            ).join("")}
              <Label resid="OA.Tab"/>
            </CustomTab>
          </ExtensionPoint>
          <ExtensionPoint xsi:type="ContextMenu">${(h === "Workbook" ? ["ContextMenuText", "ContextMenuCell"] : ["ContextMenuText"])
            .map(
              (menu) => `
            <OfficeMenu id="${menu}">${knop("anon-selectie", `OA.M.${menu}`)}
            </OfficeMenu>`,
            )
            .join("")}
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>`;

/** Versie van het manifest. Ophogen als de knoppen of het lint veranderen: alleen dan moet het opnieuw worden geüpload. */
export const MANIFEST_VERSIE = "0.6.0.0";

export function manifest(basis: string): string {
  const b = esc(basis.replace(/\/$/, ""));
  const host = new URL(basis).hostname;
  const idHost = host.replace(/^oa\./, "id.");
  return `<?xml version="1.0" encoding="UTF-8"?>
<OfficeApp xmlns="http://schemas.microsoft.com/office/appforoffice/1.1"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xmlns:bt="http://schemas.microsoft.com/office/officeappbasictypes/1.0"
           xmlns:ov="http://schemas.microsoft.com/office/taskpaneappversionoverrides"
           xsi:type="TaskPaneApp">
  <Id>${ID}</Id>
  <Version>${MANIFEST_VERSIE}</Version>
  <ProviderName>Digitaal GemeenGoed</ProviderName>
  <DefaultLocale>nl-NL</DefaultLocale>
  <DisplayName DefaultValue="Office Assistent"/>
  <Description DefaultValue="Metadata, toegankelijkheid en vastleggen in het informatieplatform van de gemeente. Prototype."/>
  <IconUrl DefaultValue="${b}/word/icoon-32.png"/>
  <HighResolutionIconUrl DefaultValue="${b}/word/icoon-64.png"/>
  <SupportUrl DefaultValue="https://github.com/digitaalgemeengoed/oa-adapters"/>
  <AppDomains>
    <AppDomain>${b}</AppDomain>
    <AppDomain>https://${esc(idHost)}</AppDomain>
  </AppDomains>
  <Hosts>
    <Host Name="Document"/>
    <Host Name="Workbook"/>
    <Host Name="Presentation"/>
  </Hosts>
  <Requirements>
    <Sets DefaultMinVersion="1.1">
      <Set Name="SharedRuntime" MinVersion="1.1"/>
    </Sets>
  </Requirements>
  <DefaultSettings>
    <SourceLocation DefaultValue="${b}/word/taskpane.html"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
${HOSTS.map(hostBlok).join("")}
    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="OA.Icoon16" DefaultValue="${b}/word/icoon-16.png"/>
        <bt:Image id="OA.Icoon32" DefaultValue="${b}/word/icoon-32.png"/>
        <bt:Image id="OA.Icoon80" DefaultValue="${b}/word/icoon-80.png"/>${Object.keys(KNOPPEN)
          .flatMap((id) => [16, 32, 80].map((n) => `
        <bt:Image id="OA.I.${id}.${n}" DefaultValue="${b}/iconen/${id}-${n}.png"/>`))
          .join("")}
      </bt:Images>
      <bt:Urls>
        <bt:Url id="OA.Taakvenster.Url" DefaultValue="${b}/word/taskpane.html"/>
        <bt:Url id="OA.Meer" DefaultValue="${b}/"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="OA.Titel" DefaultValue="Office Assistent"/>
        <bt:String id="OA.Tab" DefaultValue="Assistent"/>${GROEPEN.map(([id, label]) => `
        <bt:String id="${id}" DefaultValue="${label}"/>`).join("")}${Object.entries(KNOPPEN)
          .map(([id, k]) => `
        <bt:String id="OA.L.${id}" DefaultValue="${esc(k.label)}"/>`)
          .join("")}
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="OA.Uitleg" DefaultValue="Open de Office Assistent: metadata, toegankelijkheid en vastleggen."/>${Object.entries(KNOPPEN)
          .map(([id, k]) => `
        <bt:String id="OA.U.${id}" DefaultValue="${k.uitleg}"/>`)
          .join("")}
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;
}

