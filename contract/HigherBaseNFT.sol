// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title HigherBaseNFT
 * @dev ERC721 contract for minting NFTs from images created with various overlays
 */
contract HigherBaseNFT is ERC721URIStorage, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    
    // Overlay types
    enum OverlayType { HIGHER, BASE, HIGHERISE, DICKBUTTIFY }
    
    // Mapping from token ID to creator address
    mapping(uint256 => address) public creators;
    
    // Mapping from token ID to overlay type
    mapping(uint256 => OverlayType) public overlayTypes;
    
    // Mapping from Grove URL to token ID (to prevent duplicate minting)
    mapping(string => uint256) public groveUrlToTokenId;
    
    // Events
    event HigherBaseNFTMinted(
        uint256 indexed tokenId, 
        address indexed creator, 
        string groveUrl, 
        string tokenURI, 
        OverlayType overlayType
    );
    
    constructor() ERC721("Multi-Overlay Collection", "MONFT") Ownable(msg.sender) {}
    
    /**
     * @dev Checks if a Grove URL has already been minted
     * @param groveUrl The Grove URL to check
     * @return bool Whether the URL has been minted
     */
    function isGroveUrlMinted(string calldata groveUrl) public view returns (bool) {
        return groveUrlToTokenId[groveUrl] != 0;
    }
    
    /**
     * @dev Mints a new NFT for an overlay image
     * @param to Address to mint the NFT to
     * @param creator Address that created the image (can be different from recipient)
     * @param groveUrl Grove URL of the image
     * @param tokenURI Metadata URI for the NFT
     * @param overlayType Type of overlay used (0=HIGHER, 1=BASE, 2=HIGHERISE, 3=DICKBUTTIFY)
     * @return uint256 The new token ID
     */
    function mintNFT(
        address to,
        address creator,
        string calldata groveUrl,
        string calldata tokenURI,
        OverlayType overlayType
    ) external returns (uint256) {
        require(!isGroveUrlMinted(groveUrl), "This Grove URL has already been minted");
        require(uint8(overlayType) <= uint8(OverlayType.DICKBUTTIFY), "Invalid overlay type");
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();
        
        _mint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);
        
        creators[newTokenId] = creator;
        overlayTypes[newTokenId] = overlayType;
        groveUrlToTokenId[groveUrl] = newTokenId;
        
        emit HigherBaseNFTMinted(
            newTokenId, 
            creator, 
            groveUrl, 
            tokenURI, 
            overlayType
        );
        
        return newTokenId;
    }
    
    /**
     * @dev Returns the creator of a token
     * @param tokenId The token ID
     * @return address The creator's address
     */
    function getCreator(uint256 tokenId) external view returns (address) {
        require(_exists(tokenId), "Token does not exist");
        return creators[tokenId];
    }
    
    /**
     * @dev Returns the overlay type of a token
     * @param tokenId The token ID
     * @return OverlayType The overlay type (HIGHER, BASE, HIGHERISE, or DICKBUTTIFY)
     */
    function getOverlayType(uint256 tokenId) external view returns (OverlayType) {
        require(_exists(tokenId), "Token does not exist");
        return overlayTypes[tokenId];
    }
    
    /**
     * @dev Returns the token ID for a Grove URL
     * @param groveUrl The Grove URL
     * @return uint256 The token ID (0 if not minted)
     */
    function getTokenIdByGroveUrl(string calldata groveUrl) external view returns (uint256) {
        return groveUrlToTokenId[groveUrl];
    }
    
    /**
     * @dev Returns all tokens of a specific overlay type
     * @param overlayType The overlay type to filter by
     * @return uint256[] Array of token IDs with the specified overlay type
     */
    function getTokensByOverlayType(OverlayType overlayType) external view returns (uint256[] memory) {
        uint256 totalSupply = _tokenIds.current();
        uint256[] memory result = new uint256[](totalSupply);
        uint256 resultIndex = 0;
        
        for (uint256 i = 1; i <= totalSupply; i++) {
            if (_exists(i) && overlayTypes[i] == overlayType) {
                result[resultIndex] = i;
                resultIndex++;
            }
        }
        
        // Resize the array to the actual number of matching tokens
        uint256[] memory finalResult = new uint256[](resultIndex);
        for (uint256 i = 0; i < resultIndex; i++) {
            finalResult[i] = result[i];
        }
        
        return finalResult;
    }
    
    /**
     * @dev Checks if a token exists
     * @param tokenId The token ID to check
     * @return bool Whether the token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
} 