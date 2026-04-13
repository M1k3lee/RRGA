import xml.etree.ElementTree as ET

from app.ingest.sources.ofac import NAMESPACE, _collect_id_metadata, _names


def test_ofac_name_and_identifier_helpers_parse_live_shape() -> None:
    xml = """
    <sdnEntry xmlns="https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/XML">
      <uid>123</uid>
      <firstName>Ismail Abdul Salah</firstName>
      <lastName>HANIYA</lastName>
      <akaList>
        <aka>
          <firstName>Ismail</firstName>
          <lastName>HANIYA</lastName>
        </aka>
      </akaList>
      <idList>
        <id>
          <idType>Digital Currency Address - ETH</idType>
          <idNumber>0x1234567890abcdef1234567890abcdef12345678</idNumber>
        </id>
      </idList>
    </sdnEntry>
    """
    entry = ET.fromstring(xml)
    label, aliases = _names(entry)
    identifiers, wallets, websites = _collect_id_metadata(entry)

    assert label == "Ismail Abdul Salah HANIYA"
    assert aliases == ["Ismail HANIYA"]
    assert identifiers[0]["type"] == "Digital Currency Address - ETH"
    assert wallets == [("eth", "0x1234567890abcdef1234567890abcdef12345678")]
    assert websites == []
