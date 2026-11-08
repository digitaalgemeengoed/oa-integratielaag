/**
 * Het manifest van de invoegtoepassing voor Word, Excel en PowerPoint, met
 * het adres van deze omgeving erin. In het programma: Invoegtoepassingen →
 * Mijn invoegtoepassingen → Mijn invoegtoepassing uploaden, en kies dit
 * bestand. Welke versie van Office.js minimaal nodig is, controleert het
 * takenvenster zelf per programma (WordApi 1.3, ExcelApi 1.9,
 * PowerPointApi 1.4); in het manifest zou één eis voor alle drie gelden.
 */
const ID = "b600d63a-a8ab-46cd-9f8d-c60b6e9cab00";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const HOSTS = ["Document", "Workbook", "Presentation"] as const;

const knop = (h: (typeof HOSTS)[number]) => `      <Host xsi:type="${h}">
        <DesktopFormFactor>
          <GetStarted>
            <Title resid="OA.Titel"/>
            <Description resid="OA.Uitleg"/>
            <LearnMoreUrl resid="OA.Meer"/>
          </GetStarted>
          <ExtensionPoint xsi:type="PrimaryCommandSurface">
            <OfficeTab id="TabHome">
              <Group id="OA.Groep">
                <Label resid="OA.Titel"/>
                <Icon>
                  <bt:Image size="16" resid="OA.Icoon16"/>
                  <bt:Image size="32" resid="OA.Icoon32"/>
                  <bt:Image size="80" resid="OA.Icoon80"/>
                </Icon>
                <Control xsi:type="Button" id="OA.Knop">
                  <Label resid="OA.Knop"/>
                  <Supertip>
                    <Title resid="OA.Knop"/>
                    <Description resid="OA.Uitleg"/>
                  </Supertip>
                  <Icon>
                    <bt:Image size="16" resid="OA.Icoon16"/>
                    <bt:Image size="32" resid="OA.Icoon32"/>
                    <bt:Image size="80" resid="OA.Icoon80"/>
                  </Icon>
                  <Action xsi:type="ShowTaskpane">
                    <TaskpaneId>OA.Taakvenster</TaskpaneId>
                    <SourceLocation resid="OA.Taakvenster.Url"/>
                  </Action>
                </Control>
              </Group>
            </OfficeTab>
          </ExtensionPoint>
        </DesktopFormFactor>
      </Host>
`;

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
  <Version>0.4.0.0</Version>
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
  <DefaultSettings>
    <SourceLocation DefaultValue="${b}/word/taskpane.html"/>
  </DefaultSettings>
  <Permissions>ReadWriteDocument</Permissions>
  <VersionOverrides xmlns="http://schemas.microsoft.com/office/taskpaneappversionoverrides" xsi:type="VersionOverridesV1_0">
    <Hosts>
${HOSTS.map((h) => knop(h)).join("")}    </Hosts>
    <Resources>
      <bt:Images>
        <bt:Image id="OA.Icoon16" DefaultValue="${b}/word/icoon-16.png"/>
        <bt:Image id="OA.Icoon32" DefaultValue="${b}/word/icoon-32.png"/>
        <bt:Image id="OA.Icoon80" DefaultValue="${b}/word/icoon-80.png"/>
      </bt:Images>
      <bt:Urls>
        <bt:Url id="OA.Taakvenster.Url" DefaultValue="${b}/word/taskpane.html"/>
        <bt:Url id="OA.Meer" DefaultValue="${b}/"/>
      </bt:Urls>
      <bt:ShortStrings>
        <bt:String id="OA.Titel" DefaultValue="Office Assistent"/>
        <bt:String id="OA.Knop" DefaultValue="Assistent"/>
      </bt:ShortStrings>
      <bt:LongStrings>
        <bt:String id="OA.Uitleg" DefaultValue="Open de Office Assistent: metadata, toegankelijkheid en vastleggen."/>
      </bt:LongStrings>
    </Resources>
  </VersionOverrides>
</OfficeApp>
`;
}

