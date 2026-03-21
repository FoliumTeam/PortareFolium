export default function YouTubeEmbed({ id }: { id: string }) {
    const embedUrl = `https://www.youtube.com/embed/${id}`;
    return (
        <div className="youtube-embed-wrapper">
            <iframe
                src={embedUrl}
                title="YouTube video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="youtube-embed"
            />
        </div>
    );
}
